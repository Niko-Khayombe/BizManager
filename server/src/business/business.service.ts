import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { Prisma } from '@prisma/client';
import { CreateBusinessRoleDto } from './dto/create-business-role.dto.js';
import { UpdateBusinessMemberRoleDto } from './dto/update-business-member-role.dto.js';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBusinessDto } from './dto/create-business.dto.js';
import { AddBusinessMemberDto } from './dto/add-business-member.dto.js';
import {
  SYSTEM_PERMISSIONS,
  ROLE_PERMISSION_KEYS,
} from './permissions/permissions.constants.js';

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateBusinessDto) {
    const name = dto.name.trim();

    if (!name) {
      throw new BadRequestException('Business name cannot be empty.',);
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!user) {
        throw new NotFoundException('User not found.');
      }

      const business = await tx.business.create({
        data: {
          name,
          email: dto.email?.trim().toLowerCase() || null,
          phone: dto.phone?.trim() || null,
          address: dto.address?.trim() || null,
          currency: dto.currency || 'KES',
        },
      });

      const defaultRoles = [
        { name: 'Owner', key: 'OWNER' },
        { name: 'Admin', key: 'ADMIN' },
        { name: 'Manager', key: 'MANAGER' },
        { name: 'Sales', key: 'SALES' },
        { name: 'Stock Manager', key: 'STOCK_MANAGER' },
        { name: 'Accountant', key: 'ACCOUNTANT' },
      ];

      const roles = await Promise.all(
        defaultRoles.map((role) =>
          tx.role.create({
            data: {
              ...role,
              businessId: business.id,
              isSystem: true,
            },
          }),
        ),
      );

// Register all system permissions.
await tx.permission.createMany({
  data: [...SYSTEM_PERMISSIONS],
  skipDuplicates: true,
});

// Retrieve the permission records.
const permissions = await tx.permission.findMany({
  where: {
    key: {
      in: SYSTEM_PERMISSIONS.map((permission) => permission.key),
    },
  },
  select: {
    id: true,
    key: true,
  },
});

// Assign permissions to each role.
await Promise.all(
  roles.map((role) => {
    const allowedKeys = new Set<string>(
      ROLE_PERMISSION_KEYS[
        role.key as keyof typeof ROLE_PERMISSION_KEYS
      ],
    );

    const assignments = permissions
      .filter((permission) => allowedKeys.has(permission.key))
      .map((permission) => ({
        businessId: business.id,
        roleId: role.id,
        permissionId: permission.id,
      }));

    return tx.rolePermission.createMany({
      data: assignments,
      skipDuplicates: true,
    });
  }),
);

      const ownerRole = roles.find((role) => role.key === 'OWNER');

      if (!ownerRole) {
        throw new Error('Owner role could not be created.');
      }

      await tx.businessMembership.create({
        data: {
          businessId: business.id,
          userId,
          roleId: ownerRole.id,
        },
      });

      return {
        message: 'Business created successfully.',
        business,
        roles,
        membership: {
          userId,
          role: ownerRole.name,
        },
      };
    });
  }


async findMyBusinesses(userId: string) {
  const memberships = await this.prisma.businessMembership.findMany({
    where: {
      userId,
    },
    include: {
      business: true,
      role: {
        select: {
          name: true,
          key: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return memberships.map((membership) => ({
    membershipId: membership.id,
    role: membership.role.name,
    roleKey: membership.role.key,
    business: membership.business,
  }));
}

async findMembers(businessId: string) {
  const memberships = await this.prisma.businessMembership.findMany({
    where: {
      businessId,
    },
    select: {
      id: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      role: {
        select: {
          id: true,
          name: true,
          key: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  return memberships.map((membership) => ({
    membershipId: membership.id,
    joinedAt: membership.createdAt,
    user: membership.user,
    role: membership.role,
  }));
}

async findRoles(businessId: string) {
  return this.prisma.role.findMany({
    where: {
      businessId,
    },
    select: {
      id: true,
      name: true,
      key: true,
    },
    orderBy: {
      name: 'asc',
    },
  });
}

async createRole(
  businessId: string,
  dto: CreateBusinessRoleDto,
) {
  const name = dto.name.trim();

  if (!name) {
    throw new BadRequestException(
      'Role name cannot be empty.',
    );
  }

  const key = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!key || key.length > 50) {
    throw new BadRequestException(
      'Invalid role name.',
    );
  }

  const reservedKeys = Object.keys(ROLE_PERMISSION_KEYS);

  if (reservedKeys.includes(key)) {
    throw new BadRequestException(
      'This role name is reserved for a system role.',
    );
  }

  const validPermissionKeys = new Set(
    SYSTEM_PERMISSIONS.map((permission) => permission.key),
  );

  const invalidPermissions = dto.permissions.filter(
    (permission) => !validPermissionKeys.has(
      permission as (typeof SYSTEM_PERMISSIONS)[number]['key'],
    ),
  );

  if (invalidPermissions.length > 0) {
    throw new BadRequestException(
      `Invalid permissions: ${invalidPermissions.join(', ')}`,
    );
  }

    try {
    return await this.prisma.$transaction(async (tx) => {
    const existingRole = await tx.role.findFirst({
      where: {
        businessId,
        OR: [
          { key },
          { name: { equals: name, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });

    if (existingRole) {
      throw new ConflictException(
        'A role with this name already exists.',
      );
    }

    const permissions = await tx.permission.findMany({
      where: {
        key: { in: dto.permissions },
      },
      select: {
        id: true,
        key: true,
      },
    });

    if (permissions.length !== dto.permissions.length) {
      throw new BadRequestException(
        'One or more permissions are not registered.',
      );
    }

    const role = await tx.role.create({
      data: {
        businessId,
        name,
        key,
        isSystem: false,
      },
      select: {
        id: true,
        name: true,
        key: true,
        isSystem: true,
      },
    });

    if (permissions.length > 0) {
      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({
          businessId,
          roleId: role.id,
          permissionId: permission.id,
        })),
      });
    }

    return {
      message: 'Custom role created successfully.',
      role,
      permissions: permissions.map((permission) => permission.key),
    };
      });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'A role with this name already exists.',
      );
    }

    throw error;
  }
}


async addMember(
  businessId: string,
  dto: AddBusinessMemberDto,
) {
  const email = dto.email.trim().toLowerCase();

  return this.prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      throw new NotFoundException(
        'No registered user found with this email.',
      );
    }

    const role = await tx.role.findFirst({
      where: {
        id: dto.roleId,
        businessId,
      },
      select: {
        id: true,
        name: true,
        key: true,
      },
    });

    if (!role) {
      throw new NotFoundException(
        'Role not found in this business.',
      );
    }

    if (role.key === 'OWNER') {
      throw new BadRequestException(
        'The Owner role cannot be assigned through this operation.',
      );
    }

    const existingMembership =
      await tx.businessMembership.findUnique({
        where: {
          businessId_userId: {
            businessId,
            userId: user.id,
          },
        },
        select: {
          id: true,
        },
      });

    if (existingMembership) {
      throw new ConflictException(
        'This user is already a member of the business.',
      );
    }

    const membership = await tx.businessMembership.create({
      data: {
        businessId,
        userId: user.id,
        roleId: role.id,
      },
      select: {
        id: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            key: true,
          },
        },
      },
    });

    return {
      message: 'Team member added successfully.',
      membership: {
        membershipId: membership.id,
        joinedAt: membership.createdAt,
        user: membership.user,
        role: membership.role,
      },
    };
  });
}

async updateMemberRole(
  businessId: string,
  membershipId: string,
  dto: UpdateBusinessMemberRoleDto,
) {
  return this.prisma.$transaction(async (tx) => {
    const membership = await tx.businessMembership.findFirst({
      where: {
        id: membershipId,
        businessId,
      },
      select: {
        id: true,
        role: {
          select: {
            key: true,
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException(
        'Team member not found in this business.',
      );
    }

    if (membership.role.key === 'OWNER') {
      throw new BadRequestException(
        'The Owner role cannot be changed through this operation.',
      );
    }

    const role = await tx.role.findFirst({
      where: {
        id: dto.roleId,
        businessId,
      },
      select: {
        id: true,
        name: true,
        key: true,
      },
    });

    if (!role) {
      throw new NotFoundException(
        'Role not found in this business.',
      );
    }

    if (role.key === 'OWNER') {
      throw new BadRequestException(
        'The Owner role cannot be assigned through this operation.',
      );
    }

    const updatedMembership =
      await tx.businessMembership.update({
        where: {
          id: membershipId,
        },
        data: {
          roleId: role.id,
        },
        select: {
          id: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              key: true,
            },
          },
        },
      });

    return {
      message: 'Team member role updated successfully.',
      membership: {
        membershipId: updatedMembership.id,
        joinedAt: updatedMembership.createdAt,
        user: updatedMembership.user,
        role: updatedMembership.role,
      },
    };
  });
}

async removeMember(
  businessId: string,
  membershipId: string,
) {
  return this.prisma.$transaction(async (tx) => {
    const membership = await tx.businessMembership.findFirst({
      where: {
        id: membershipId,
        businessId,
      },
      select: {
        id: true,
        role: {
          select: {
            key: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException(
        'Team member not found in this business.',
      );
    }

    if (membership.role.key === 'OWNER') {
      throw new BadRequestException(
        'The Owner cannot be removed from the business.',
      );
    }

    await tx.businessMembership.delete({
      where: {
        id: membership.id,
      },
    });

    return {
      message: 'Team member removed successfully.',
      member: membership.user,
    };
  });
}

async createCustomer(
  businessId: string,
  dto: CreateCustomerDto,
) {
  const name = dto.name.trim();

  if (!name) {
    throw new BadRequestException(
      'Customer name cannot be empty.',
    );
  }

  const customer = await this.prisma.customer.create({
    data: {
      businessId,
      name,
      email: dto.email?.trim().toLowerCase() || null,
      phone: dto.phone?.trim() || null,
      address: dto.address?.trim() || null,
    },
  });

  return {
    message: 'Customer created successfully.',
    customer,
  };
}

async findCustomers(businessId: string) {
  return this.prisma.customer.findMany({
    where: {
      businessId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

async findCustomer(
  businessId: string,
  customerId: string,
) {
  const customer = await this.prisma.customer.findFirst({
    where: {
      id: customerId,
      businessId,
    },
  });

  if (!customer) {
    throw new NotFoundException(
      'Customer not found in this business.',
    );
  }

  return customer;
}

async updateCustomer(
  businessId: string,
  customerId: string,
  dto: UpdateCustomerDto,
) {
  const existingCustomer = await this.prisma.customer.findFirst({
    where: {
      id: customerId,
      businessId,
    },
    select: {
      id: true,
    },
  });

  if (!existingCustomer) {
    throw new NotFoundException(
      'Customer not found in this business.',
    );
  }

  const data: {
    name?: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  } = {};

  if (dto.name !== undefined) {
    const name = dto.name.trim();

    if (!name) {
      throw new BadRequestException(
        'Customer name cannot be empty.',
      );
    }

    data.name = name;
  }

  if (dto.email !== undefined) {
    data.email = dto.email.trim().toLowerCase() || null;
  }

  if (dto.phone !== undefined) {
    data.phone = dto.phone.trim() || null;
  }

  if (dto.address !== undefined) {
    data.address = dto.address.trim() || null;
  }

  const customer = await this.prisma.customer.update({
    where: {
      id: existingCustomer.id,
    },
    data,
  });

  return {
    message: 'Customer updated successfully.',
    customer,
  };
}

async deleteCustomer(
  businessId: string,
  customerId: string,
) {
  const result = await this.prisma.customer.deleteMany({
    where: {
      id: customerId,
      businessId,
    },
  });

  if (result.count === 0) {
    throw new NotFoundException(
      'Customer not found in this business.',
    );
  }

  return {
    message: 'Customer deleted successfully.',
  };
}

async findOne(businessId: string) {
  const business = await this.prisma.business.findUnique({
    where: {
      id: businessId,
    },
  });

  if (!business) {
    throw new NotFoundException('Business not found.');
  }

  return business;
}

}
