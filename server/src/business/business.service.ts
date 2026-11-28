import { GetStockLevelsDto } from './dto/get-stock-levels.dto.js';
import { GetStockMovementsDto } from './dto/get-stock-movements.dto.js';
import { CreateStockLocationDto } from './dto/create-stock-location.dto.js';
import { UpdateStockLocationDto } from './dto/update-stock-location.dto.js';
import { CreateStockReceiptDto } from './dto/create-stock-receipt.dto.js';
import { CreateStockIssueDto } from './dto/create-stock-issue.dto.js';
import { CreateStockTransferDto } from './dto/create-stock-transfer.dto.js';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { Prisma, StockMovementType } from '@prisma/client';
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

async createProduct(
  businessId: string,
  dto: CreateProductDto,
) {
  const name = dto.name.trim();
  const sku = dto.sku.trim().toUpperCase();
  const categoryId = dto.categoryId?.trim();

  if (!name) {
    throw new BadRequestException(
      'Product name cannot be empty.',
    );
  }

  if (!sku) {
    throw new BadRequestException(
      'Product SKU cannot be empty.',
    );
  }

  if (categoryId) {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        businessId,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      throw new BadRequestException(
        'Category does not belong to this business.',
      );
    }
  }

  try {
    const product = await this.prisma.product.create({
      data: {
        businessId,
        categoryId: categoryId || null,
        name,
        description: dto.description?.trim() || null,
        sku,
        barcode: dto.barcode?.trim() || null,
        costPrice: dto.costPrice ?? 0,
        sellingPrice: dto.sellingPrice,
        minimumStock: dto.minimumStock ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    return {
      message: 'Product created successfully.',
      product,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'A product with this SKU already exists in this business.',
      );
    }

    throw error;
  }
}

async findProducts(businessId: string) {
  return this.prisma.product.findMany({
    where: {
      businessId,
    },
    include: {
      category: true,
    },
    orderBy: {
      name: 'asc',
    },
  });
}

async findProduct(
  businessId: string,
  productId: string,
) {
  const product = await this.prisma.product.findFirst({
    where: {
      id: productId,
      businessId,
    },
    include: {
      category: true,
    },
  });

  if (!product) {
    throw new NotFoundException(
      'Product not found in this business.',
    );
  }

  return product;
}

async updateProduct(
  businessId: string,
  productId: string,
  dto: UpdateProductDto,
) {
  const existingProduct = await this.prisma.product.findFirst({
    where: {
      id: productId,
      businessId,
    },
    select: {
      id: true,
    },
  });

  if (!existingProduct) {
    throw new NotFoundException(
      'Product not found in this business.',
    );
  }

  const data: Prisma.ProductUpdateInput = {};

  if (dto.name !== undefined) {
    const name = dto.name.trim();

    if (!name) {
      throw new BadRequestException(
        'Product name cannot be empty.',
      );
    }

    data.name = name;
  }

  if (dto.description !== undefined) {
    data.description = dto.description.trim() || null;
  }

  if (dto.sku !== undefined) {
    const sku = dto.sku.trim().toUpperCase();

    if (!sku) {
      throw new BadRequestException(
        'Product SKU cannot be empty.',
      );
    }

    data.sku = sku;
  }

  if (dto.barcode !== undefined) {
    data.barcode = dto.barcode.trim() || null;
  }

  if (dto.costPrice !== undefined) {
    data.costPrice = dto.costPrice;
  }

  if (dto.sellingPrice !== undefined) {
    data.sellingPrice = dto.sellingPrice;
  }

  if (dto.minimumStock !== undefined) {
  data.minimumStock = dto.minimumStock;
  }

  if (dto.isActive !== undefined) {
    data.isActive = dto.isActive;
  }

  if (dto.categoryId !== undefined) {
    const category = await this.prisma.category.findFirst({
      where: {
        id: dto.categoryId,
        businessId,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      throw new BadRequestException(
        'Category does not belong to this business.',
      );
    }

    data.category = {
      connect: {
        id: category.id,
      },
    };
  }

  try {
    const product = await this.prisma.product.update({
      where: {
        id: productId,
      },
      data,
      include: {
        category: true,
      },
    });

    return {
      message: 'Product updated successfully.',
      product,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'A product with this SKU already exists in this business.',
      );
    }

    throw error;
  }
}

async deleteProduct(
  businessId: string,
  productId: string,
) {
  const result = await this.prisma.product.deleteMany({
    where: {
      id: productId,
      businessId,
    },
  });

  if (result.count === 0) {
    throw new NotFoundException(
      'Product not found in this business.',
    );
  }

  return {
    message: 'Product deleted successfully.',
  };
}

async createCategory(
  businessId: string,
  dto: CreateCategoryDto,
) {
  const name = dto.name.trim();

  if (!name) {
    throw new BadRequestException(
      'Category name cannot be empty.',
    );
  }

  try {
    const category = await this.prisma.category.create({
      data: {
        businessId,
        name,
        description: dto.description?.trim() || null,
      },
    });

    return {
      message: 'Category created successfully.',
      category,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'A category with this name already exists in this business.',
      );
    }

    throw error;
  }
}

async findCategories(businessId: string) {
  return this.prisma.category.findMany({
    where: {
      businessId,
    },
    orderBy: {
      name: 'asc',
    },
  });
}

async findCategory(
  businessId: string,
  categoryId: string,
) {
  const category = await this.prisma.category.findFirst({
    where: {
      id: categoryId,
      businessId,
    },
  });

  if (!category) {
    throw new NotFoundException(
      'Category not found in this business.',
    );
  }

  return category;
}

async updateCategory(
  businessId: string,
  categoryId: string,
  dto: UpdateCategoryDto,
) {
  const existingCategory = await this.prisma.category.findFirst({
    where: {
      id: categoryId,
      businessId,
    },
    select: {
      id: true,
    },
  });

  if (!existingCategory) {
    throw new NotFoundException(
      'Category not found in this business.',
    );
  }

  const data: {
    name?: string;
    description?: string | null;
  } = {};

  if (dto.name !== undefined) {
    const name = dto.name.trim();

    if (!name) {
      throw new BadRequestException(
        'Category name cannot be empty.',
      );
    }

    data.name = name;
  }

  if (dto.description !== undefined) {
    data.description = dto.description.trim() || null;
  }

  try {
    const category = await this.prisma.category.update({
      where: {
        id: existingCategory.id,
      },
      data,
    });

    return {
      message: 'Category updated successfully.',
      category,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'A category with this name already exists in this business.',
      );
    }

    throw error;
  }
}

async deleteCategory(
  businessId: string,
  categoryId: string,
) {
  const result = await this.prisma.category.deleteMany({
    where: {
      id: categoryId,
      businessId,
    },
  });

  if (result.count === 0) {
    throw new NotFoundException(
      'Category not found in this business.',
    );
  }

  return {
    message: 'Category deleted successfully.',
  };
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

async createStockLocation(
  businessId: string,
  dto: CreateStockLocationDto,
) {
  const name = dto.name.trim();

  if (!name) {
    throw new BadRequestException(
      'Stock location name cannot be empty.',
    );
  }

  try {
    const location = await this.prisma.stockLocation.create({
      data: {
        businessId,
        name,
        description: dto.description?.trim() || null,
      },
    });

    return {
      message: 'Stock location created successfully.',
      location,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'A stock location with this name already exists.',
      );
    }

    throw error;
  }
}

async findStockLocations(businessId: string) {
  return this.prisma.stockLocation.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
  });
}

async findStockLocation(
  businessId: string,
  locationId: string,
) {
  const location = await this.prisma.stockLocation.findFirst({
    where: {
      id: locationId,
      businessId,
    },
  });

  if (!location) {
    throw new NotFoundException(
      'Stock location not found in this business.',
    );
  }

  return location;
}

async updateStockLocation(
  businessId: string,
  locationId: string,
  dto: UpdateStockLocationDto,
) {
  const existingLocation = await this.findStockLocation(
    businessId,
    locationId,
  );

  const data: {
    name?: string;
    description?: string | null;
    isActive?: boolean;
  } = {};

  if (dto.name !== undefined) {
    const name = dto.name.trim();

    if (!name) {
      throw new BadRequestException(
        'Stock location name cannot be empty.',
      );
    }

    data.name = name;
  }

  if (dto.description !== undefined) {
    data.description = dto.description.trim() || null;
  }

  if (dto.isActive !== undefined) {
    data.isActive = dto.isActive;
  }

  try {
    const location = await this.prisma.stockLocation.update({
      where: {
        id: existingLocation.id,
      },
      data,
    });

    return {
      message: 'Stock location updated successfully.',
      location,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'A stock location with this name already exists.',
      );
    }

    throw error;
  }
}

async deleteStockLocation(
  businessId: string,
  locationId: string,
) {
  const location = await this.findStockLocation(
    businessId,
    locationId,
  );

  const [stockCount, movementCount] = await Promise.all([
    this.prisma.productStock.count({
      where: {
        businessId,
        locationId,
      },
    }),
    this.prisma.stockMovement.count({
      where: {
        businessId,
        OR: [
          { fromLocationId: locationId },
          { toLocationId: locationId },
        ],
      },
    }),
  ]);

  if (stockCount > 0 || movementCount > 0) {
    throw new ConflictException(
      'This location cannot be deleted because it has stock records or movement history. Deactivate it instead.',
    );
  }

  await this.prisma.stockLocation.delete({
    where: {
      id: location.id,
    },
  });

  return {
    message: 'Stock location deleted successfully.',
  };
}

async receiveStock(
  businessId: string,
  dto: CreateStockReceiptDto,
) {
  return this.prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: {
        id: dto.productId,
        businessId,
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        'Active product not found in this business.',
      );
    }

    const location = await tx.stockLocation.findFirst({
      where: {
        id: dto.locationId,
        businessId,
        isActive: true,
      },
    });

    if (!location) {
      throw new NotFoundException(
        'Active stock location not found in this business.',
      );
    }

    const quantity = new Prisma.Decimal(dto.quantity);

    const stock = await tx.productStock.upsert({
      where: {
        businessId_productId_locationId: {
          businessId,
          productId: dto.productId,
          locationId: dto.locationId,
        },
      },
      create: {
        businessId,
        productId: dto.productId,
        locationId: dto.locationId,
        quantity,
      },
      update: {
        quantity: {
          increment: quantity,
        },
      },
    });

    const movement = await tx.stockMovement.create({
      data: {
        businessId,
        productId: dto.productId,
        type: 'RECEIPT',
        quantity,
        toLocationId: dto.locationId,
        reference: dto.reference?.trim() || null,
        note: dto.note?.trim() || null,
      },
    });

    return {
      message: 'Stock received successfully.',
      stock,
      movement,
    };
  });
}

async issueStock(
  businessId: string,
  dto: CreateStockIssueDto,
) {
  return this.prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: {
        id: dto.productId,
        businessId,
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        'Active product not found in this business.',
      );
    }

    const location = await tx.stockLocation.findFirst({
      where: {
        id: dto.locationId,
        businessId,
        isActive: true,
      },
    });

    if (!location) {
      throw new NotFoundException(
        'Active stock location not found in this business.',
      );
    }

    const quantity = new Prisma.Decimal(dto.quantity);

    const result = await tx.productStock.updateMany({
      where: {
        businessId,
        productId: dto.productId,
        locationId: dto.locationId,
        quantity: {
          gte: quantity,
        },
      },
      data: {
        quantity: {
          decrement: quantity,
        },
      },
    });

    if (result.count === 0) {
      throw new BadRequestException(
        'Insufficient stock. The requested quantity is not available.',
      );
    }

    const stock = await tx.productStock.findUnique({
      where: {
        businessId_productId_locationId: {
          businessId,
          productId: dto.productId,
          locationId: dto.locationId,
        },
      },
    });

    const movement = await tx.stockMovement.create({
      data: {
        businessId,
        productId: dto.productId,
        type: 'ISSUE',
        quantity,
        fromLocationId: dto.locationId,
        reference: dto.reference?.trim() || null,
        note: dto.note?.trim() || null,
      },
    });

    return {
      message: 'Stock issued successfully.',
      stock,
      movement,
    };
  });
}

async adjustStock(
  businessId: string,
  dto: CreateStockAdjustmentDto,
) {
  try {
    return await this.prisma.$transaction(
      async (tx) => {
        const product = await tx.product.findFirst({
          where: {
            id: dto.productId,
            businessId,
            isActive: true,
          },
        });

        if (!product) {
          throw new NotFoundException(
            'Active product not found in this business.',
          );
        }

        const location = await tx.stockLocation.findFirst({
          where: {
            id: dto.locationId,
            businessId,
            isActive: true,
          },
        });

        if (!location) {
          throw new NotFoundException(
            'Active stock location not found in this business.',
          );
        }

        const existingStock = await tx.productStock.findUnique({
          where: {
            businessId_productId_locationId: {
              businessId,
              productId: dto.productId,
              locationId: dto.locationId,
            },
          },
        });

        const currentQuantity =
          existingStock?.quantity ?? new Prisma.Decimal(0);

        const newQuantity = new Prisma.Decimal(dto.newQuantity);

        const difference = newQuantity.minus(currentQuantity);

        const stock = await tx.productStock.upsert({
          where: {
            businessId_productId_locationId: {
              businessId,
              productId: dto.productId,
              locationId: dto.locationId,
            },
          },
          create: {
            businessId,
            productId: dto.productId,
            locationId: dto.locationId,
            quantity: newQuantity,
          },
          update: {
            quantity: newQuantity,
          },
        });

        const movement = await tx.stockMovement.create({
          data: {
            businessId,
            productId: dto.productId,
            type: 'ADJUSTMENT',
            quantity: difference,
            fromLocationId: dto.locationId,
            toLocationId: dto.locationId,
            reference: dto.reference?.trim() || null,
            note: dto.note?.trim() || null,
          },
        });

        return {
          message: 'Stock adjusted successfully.',
          previousQuantity: currentQuantity,
          newQuantity,
          difference,
          stock,
          movement,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    ) {
      throw new ConflictException(
        'A concurrent stock adjustment occurred. Please retry.',
      );
    }

    throw error;
  }
}

async transferStock(
  businessId: string,
  dto: CreateStockTransferDto,
) {
  if (dto.fromLocationId === dto.toLocationId) {
    throw new BadRequestException(
      'Source and destination locations must be different.',
    );
  }

  return this.prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: {
        id: dto.productId,
        businessId,
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        'Active product not found in this business.',
      );
    }

    const sourceLocation = await tx.stockLocation.findFirst({
      where: {
        id: dto.fromLocationId,
        businessId,
        isActive: true,
      },
    });

    if (!sourceLocation) {
      throw new NotFoundException(
        'Active source stock location not found in this business.',
      );
    }

    const destinationLocation = await tx.stockLocation.findFirst({
      where: {
        id: dto.toLocationId,
        businessId,
        isActive: true,
      },
    });

    if (!destinationLocation) {
      throw new NotFoundException(
        'Active destination stock location not found in this business.',
      );
    }

    const quantity = new Prisma.Decimal(dto.quantity);

    const result = await tx.productStock.updateMany({
      where: {
        businessId,
        productId: dto.productId,
        locationId: dto.fromLocationId,
        quantity: {
          gte: quantity,
        },
      },
      data: {
        quantity: {
          decrement: quantity,
        },
      },
    });

    if (result.count === 0) {
      throw new BadRequestException(
        'Insufficient stock at the source location.',
      );
    }

    const destinationStock = await tx.productStock.upsert({
      where: {
        businessId_productId_locationId: {
          businessId,
          productId: dto.productId,
          locationId: dto.toLocationId,
        },
      },
      create: {
        businessId,
        productId: dto.productId,
        locationId: dto.toLocationId,
        quantity,
      },
      update: {
        quantity: {
          increment: quantity,
        },
      },
    });

    const movement = await tx.stockMovement.create({
      data: {
        businessId,
        productId: dto.productId,
        type: 'TRANSFER',
        quantity,
        fromLocationId: dto.fromLocationId,
        toLocationId: dto.toLocationId,
        reference: dto.reference?.trim() || null,
        note: dto.note?.trim() || null,
      },
    });

    return {
      message: 'Stock transferred successfully.',
      transferredQuantity: quantity,
      destinationStock,
      movement,
    };
  });
}

async findStockLevels(
  businessId: string,
  dto: GetStockLevelsDto,
) {
  const stocks = await this.prisma.productStock.findMany({
    where: {
      businessId,
      ...(dto.productId ? { productId: dto.productId } : {}),
      ...(dto.locationId ? { locationId: dto.locationId } : {}),
    },
    include: {
      product: true,
      location: true,
    },
    orderBy: [
      { product: { name: 'asc' } },
      { location: { name: 'asc' } },
    ],
  });

  const results = stocks.map((stock) => ({
    ...stock,
    isLowStock: stock.quantity.lte(stock.product.minimumStock),
  }));

  const filteredStocks = dto.lowStockOnly === 'true'
  ? results.filter((stock) => stock.isLowStock)
  : results;

  return {
    total: filteredStocks.length,
    stocks: filteredStocks,
  };
}

async findLowStockProducts(businessId: string) {
  const products = await this.prisma.product.findMany({
    where: {
      businessId,
      isActive: true,
    },
    include: {
      stocks: {
        where: { businessId },
        include: {
          location: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const lowStockProducts = products
    .map((product) => {
      const totalQuantity = product.stocks.reduce(
        (total, stock) => total.add(stock.quantity),
        new Prisma.Decimal(0),
      );

      return {
        ...product,
        totalQuantity,
        isLowStock: totalQuantity.lte(product.minimumStock),
      };
    })
    .filter((product) => product.isLowStock);

  return {
    total: lowStockProducts.length,
    products: lowStockProducts,
  };
}

async findStockMovements(
  businessId: string,
  dto: GetStockMovementsDto,
) {
  const page = dto.page ?? 1;
  const limit = dto.limit ?? 20;

  const where: Prisma.StockMovementWhereInput = {
    businessId,
    ...(dto.productId ? { productId: dto.productId } : {}),
    ...(dto.type ? { type: dto.type as StockMovementType } : {}),
    ...(dto.locationId
      ? {
          OR: [
            { fromLocationId: dto.locationId },
            { toLocationId: dto.locationId },
          ],
        }
      : {}),
  };

  const [movements, total] = await Promise.all([
  this.prisma.stockMovement.findMany({
    where,
    include: {
      product: true,
      fromLocation: true,
      toLocation: true,
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  }),
  this.prisma.stockMovement.count({ where }),
]);

  return {
    movements,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
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
