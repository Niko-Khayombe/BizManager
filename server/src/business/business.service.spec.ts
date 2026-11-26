import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
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
