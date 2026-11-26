import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BusinessService } from './business.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  SYSTEM_PERMISSIONS,
  ROLE_PERMISSION_KEYS,
} from './permissions/permissions.constants.js';

describe('BusinessService', () => {
  let service: BusinessService;

  describe('findMembers', () => {
  it('should return members belonging to the specified business', async () => {
    const joinedAt = new Date('2026-11-26T10:00:00.000Z');

    const fakeMemberships = [
      {
        id: 'membership-123',
        createdAt: joinedAt,
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
        role: {
          id: 'role-123',
          name: 'Sales',
          key: 'SALES',
        },
      },
    ];

    mockPrisma.businessMembership.findMany.mockResolvedValue(
      fakeMemberships,
    );

    const result = await service.findMembers('business-123');

    expect(
      mockPrisma.businessMembership.findMany,
    ).toHaveBeenCalledWith({
      where: {
        businessId: 'business-123',
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

    expect(result).toEqual([
      {
        membershipId: 'membership-123',
        joinedAt,
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
        role: {
          id: 'role-123',
          name: 'Sales',
          key: 'SALES',
        },
      },
    ]);

    expect(result[0]).not.toHaveProperty('user.passwordHash');
  });

  it('should return an empty array when the business has no members', async () => {
    mockPrisma.businessMembership.findMany.mockResolvedValue([]);

    const result = await service.findMembers('business-123');

    expect(result).toEqual([]);
  });
});

  const mockPrisma = {
    $transaction: vi.fn(),
    businessMembership: {
      findMany: vi.fn(),
    },
    business: {
      findUnique: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<BusinessService>(BusinessService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should reject an empty business name', async () => {
      await expect(
        service.create('user-123', {
          name: '   ',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should create a business, default roles and owner membership', async () => {
      const fakeBusiness = {
        id: 'business-123',
        name: 'Edwin Retail Store',
        currency: 'KES',
      };

      const fakeRoles = [
        { id: 'role-1', name: 'Owner', key: 'OWNER' },
        { id: 'role-2', name: 'Admin', key: 'ADMIN' },
        { id: 'role-3', name: 'Manager', key: 'MANAGER' },
        { id: 'role-4', name: 'Sales', key: 'SALES' },
        { id: 'role-5', name: 'Stock Manager', key: 'STOCK_MANAGER' },
        { id: 'role-6', name: 'Accountant', key: 'ACCOUNTANT' },
      ];

      const tx = {
        user: {
          findUnique: vi.fn().mockResolvedValue({ id: 'user-123' }),
        },
        business: {
          create: vi.fn().mockResolvedValue(fakeBusiness),
        },
        role: {
          create: vi.fn()
            .mockImplementation(({ data }) =>
              Promise.resolve({
                ...data,
                id: `role-${fakeRoles.findIndex(
                  (role) => role.key === data.key,
                ) + 1}`,
              }),
            ),
        },
permission: {
  createMany: vi.fn().mockResolvedValue({ count: SYSTEM_PERMISSIONS.length }),
  findMany: vi.fn().mockResolvedValue(
    SYSTEM_PERMISSIONS.map((permission, index) => ({
      id: `permission-${index + 1}`,
      key: permission.key,
    })),
  ),
},
rolePermission: {
  createMany: vi.fn().mockResolvedValue({ count: 10 }),
},
        businessMembership: {
          create: vi.fn().mockResolvedValue({
            userId: 'user-123',
            roleId: 'role-1',
          }),
        },
      };

      mockPrisma.$transaction.mockImplementation(
        (callback) => callback(tx),
      );

      const result = await service.create('user-123', {
        name: 'Edwin Retail Store',
      });

      expect(tx.business.create).toHaveBeenCalled();
      expect(tx.role.create).toHaveBeenCalledTimes(6);
// Verify that the system permission catalogue was registered.
expect(tx.permission.createMany).toHaveBeenCalledWith({
  data: [...SYSTEM_PERMISSIONS],
  skipDuplicates: true,
});

// Verify that permission records were retrieved.
expect(tx.permission.findMany).toHaveBeenCalled();

// Verify that all six roles received permission assignments.
expect(tx.rolePermission.createMany).toHaveBeenCalledTimes(6);

const assignments =
  tx.rolePermission.createMany.mock.calls.map(
    ([argument]) => argument.data,
  );

for (const role of fakeRoles) {
  const roleAssignments = assignments.flat().filter(
    (assignment) => assignment.roleId === role.id,
  );

  expect(roleAssignments).toHaveLength(
    ROLE_PERMISSION_KEYS[
      role.key as keyof typeof ROLE_PERMISSION_KEYS
    ].length,
  );
}
      expect(tx.businessMembership.create).toHaveBeenCalledWith({
        data: {
          businessId: 'business-123',
          userId: 'user-123',
          roleId: 'role-1',
        },
      });

      expect(result.business).toEqual(fakeBusiness);
      expect(result.roles).toHaveLength(6);
      expect(result.membership.role).toBe('Owner');
    });

    it('should reject creation if the user does not exist', async () => {
      const tx = {
        user: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      };

      mockPrisma.$transaction.mockImplementation(
        (callback) => callback(tx),
      );

      await expect(
        service.create('missing-user', {
          name: 'Test Business',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addMember', () => {
  const createTransaction = () => ({
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'user-456',
        name: 'Jane Doe',
        email: 'jane@example.com',
      }),
    },
    role: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'role-sales',
        name: 'Sales',
        key: 'SALES',
      }),
    },
    businessMembership: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: 'membership-456',
        createdAt: new Date('2026-11-26T10:00:00.000Z'),
        user: {
          id: 'user-456',
          name: 'Jane Doe',
          email: 'jane@example.com',
        },
        role: {
          id: 'role-sales',
          name: 'Sales',
          key: 'SALES',
        },
      }),
    },
  });

  it('should add an existing user to the business', async () => {
    const tx = createTransaction();

    mockPrisma.$transaction.mockImplementation(
      (callback) => callback(tx),
    );

    const result = await service.addMember('business-123', {
      email: ' JANE@example.com ',
      roleId: 'role-sales',
    });

    expect(tx.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'jane@example.com' },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    expect(tx.role.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'role-sales',
        businessId: 'business-123',
      },
      select: {
        id: true,
        name: true,
        key: true,
      },
    });

    expect(tx.businessMembership.create).toHaveBeenCalledWith({
      data: {
        businessId: 'business-123',
        userId: 'user-456',
        roleId: 'role-sales',
      },
      select: expect.any(Object),
    });

    expect(result.membership.user).toEqual({
      id: 'user-456',
      name: 'Jane Doe',
      email: 'jane@example.com',
    });

    expect(result.membership.user).not.toHaveProperty(
      'passwordHash',
    );
  });

  it('should reject an email that is not registered', async () => {
    const tx = createTransaction();
    tx.user.findUnique.mockResolvedValue(null);

    mockPrisma.$transaction.mockImplementation(
      (callback) => callback(tx),
    );

    await expect(
      service.addMember('business-123', {
        email: 'missing@example.com',
        roleId: 'role-sales',
      }),
    ).rejects.toThrow(NotFoundException);

    expect(tx.role.findFirst).not.toHaveBeenCalled();
  });

  it('should reject a role that does not belong to the business', async () => {
    const tx = createTransaction();
    tx.role.findFirst.mockResolvedValue(null);

    mockPrisma.$transaction.mockImplementation(
      (callback) => callback(tx),
    );

    await expect(
      service.addMember('business-123', {
        email: 'jane@example.com',
        roleId: 'foreign-role',
      }),
    ).rejects.toThrow(NotFoundException);

    expect(tx.businessMembership.create).not.toHaveBeenCalled();
  });

  it('should reject assignment of the Owner role', async () => {
    const tx = createTransaction();

    tx.role.findFirst.mockResolvedValue({
      id: 'role-owner',
      name: 'Owner',
      key: 'OWNER',
    });

    mockPrisma.$transaction.mockImplementation(
      (callback) => callback(tx),
    );

    await expect(
      service.addMember('business-123', {
        email: 'jane@example.com',
        roleId: 'role-owner',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(tx.businessMembership.create).not.toHaveBeenCalled();
  });

  it('should reject a user who is already a member', async () => {
    const tx = createTransaction();

    tx.businessMembership.findUnique.mockResolvedValue({
      id: 'existing-membership',
    });

    mockPrisma.$transaction.mockImplementation(
      (callback) => callback(tx),
    );

    await expect(
      service.addMember('business-123', {
        email: 'jane@example.com',
        roleId: 'role-sales',
      }),
    ).rejects.toThrow(ConflictException);

    expect(tx.businessMembership.create).not.toHaveBeenCalled();
  });
});

  describe('findMyBusinesses', () => {
    it('should return only the memberships belonging to the user', async () => {
      mockPrisma.businessMembership.findMany.mockResolvedValue([
        {
          id: 'membership-1',
          role: { name: 'Owner', key: 'OWNER' },
          business: {
            id: 'business-123',
            name: 'Edwin Retail Store',
          },
        },
      ]);

      const result = await service.findMyBusinesses('user-123');

      expect(
        mockPrisma.businessMembership.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
        }),
      );

      expect(result).toHaveLength(1);
      expect(result[0].business.id).toBe('business-123');
    });
  });

  describe('findOne', () => {
    it('should return a business when it exists', async () => {
      const fakeBusiness = {
        id: 'business-123',
        name: 'Edwin Retail Store',
      };

      mockPrisma.business.findUnique.mockResolvedValue(fakeBusiness);

      const result = await service.findOne('business-123');

      expect(result).toEqual(fakeBusiness);
    });

    it('should throw NotFoundException when the business does not exist', async () => {
      mockPrisma.business.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('missing-business'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
