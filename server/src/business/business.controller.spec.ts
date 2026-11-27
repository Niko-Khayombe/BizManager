
import { PrismaService } from '../prisma/prisma.service.js';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { vi } from 'vitest';
import { BusinessController } from './business.controller.js';
import { BusinessService } from './business.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { BusinessMembershipGuard } from './guards/business-membership.guard.js';
import { PermissionsGuard } from './permissions/permissions.guard.js';
import { PERMISSIONS_KEY } from './permissions/permissions.decorator.js';

describe('BusinessController', () => {
  let controller: BusinessController;

  const mockBusinessService = {
    findMembers: vi.fn(),
    addMember: vi.fn(),
    createCustomer: vi.fn(),
    findCustomers: vi.fn(),
    findCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    createRole: vi.fn(),
    updateMemberRole: vi.fn(),
    findRoles: vi.fn(),
    findMyBusinesses: vi.fn(),
    removeMember: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BusinessController],
      providers: [
        {
          provide: BusinessService,
          useValue: mockBusinessService,
        },
        {
          provide: JwtAuthGuard,
          useValue: { canActivate: () => true },
        },
        {
          provide: BusinessMembershipGuard,
          useValue: { canActivate: vi.fn().mockReturnValue(true) },
        },
        {
          provide: PermissionsGuard,
          useValue: { canActivate: () => true },
        },
        {
          provide: PrismaService,
          useValue: {
            businessMembership: {
              findUnique: vi.fn(),
            },
            rolePermission: {
              findMany: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<BusinessController>(BusinessController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('addMember', () => {
    it('should add a member to the specified business', async () => {
      const dto = {
        email: 'jane@example.com',
        roleId: 'role-sales',
      };

      const fakeResult = {
        message: 'Team member added successfully.',
        membership: {
          membershipId: 'membership-456',
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
        },
      };

      mockBusinessService.addMember.mockResolvedValue(fakeResult);

      const result = await controller.addMember(
        'business-123',
        dto,
      );

      expect(mockBusinessService.addMember).toHaveBeenCalledWith(
        'business-123',
        dto,
      );

      expect(result).toEqual(fakeResult);
    });

    it('should require the users.manage permission', () => {
      const requiredPermissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        BusinessController.prototype.addMember,
      );

      expect(requiredPermissions).toEqual(['users.manage']);
    });
  });

  describe('updateMemberRole', () => {
    it('should update a member role in the specified business', async () => {
      const dto = {
        roleId: 'role-manager',
      };

      const fakeResult = {
        message: 'Team member role updated successfully.',
        membership: {
          membershipId: 'membership-456',
          user: {
            id: 'user-456',
            name: 'Jane Doe',
            email: 'jane@example.com',
          },
          role: {
            id: 'role-manager',
            name: 'Manager',
            key: 'MANAGER',
          },
        },
      };

      mockBusinessService.updateMemberRole.mockResolvedValue(fakeResult);

      const result = await controller.updateMemberRole(
        'business-123',
        'membership-456',
        dto,
      );

      expect(mockBusinessService.updateMemberRole).toHaveBeenCalledWith(
        'business-123',
        'membership-456',
        dto,
      );

      expect(result).toEqual(fakeResult);
    });

    it('should require the users.manage permission', () => {
      const requiredPermissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        BusinessController.prototype.updateMemberRole,
      );

      expect(requiredPermissions).toEqual(['users.manage']);
    });
  });

  describe('removeMember', () => {
    it('should remove a member from the specified business', async () => {
      const fakeResult = {
        message: 'Team member removed successfully.',
        member: {
          name: 'Jane Doe',
          email: 'jane@example.com',
        },
      };

      mockBusinessService.removeMember.mockResolvedValue(fakeResult);

      const result = await controller.removeMember(
        'business-123',
        'membership-456',
      );

      expect(mockBusinessService.removeMember).toHaveBeenCalledWith(
        'business-123',
        'membership-456',
      );

      expect(result).toEqual(fakeResult);
    });

    it('should require the users.manage permission', () => {
      const requiredPermissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        BusinessController.prototype.removeMember,
      );

      expect(requiredPermissions).toEqual(['users.manage']);
    });
  });

  describe('findMembers', () => {
    it('should retrieve members for the specified business', async () => {
      const fakeMembers = [
        {
          membershipId: 'membership-123',
          joinedAt: new Date('2026-11-26T10:00:00.000Z'),
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

      mockBusinessService.findMembers.mockResolvedValue(fakeMembers);

      const result = await controller.findMembers('business-123');

      expect(mockBusinessService.findMembers).toHaveBeenCalledWith(
        'business-123',
      );

      expect(result).toEqual(fakeMembers);
    });

    it('should require the users.read permission', () => {
      const requiredPermissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        BusinessController.prototype.findMembers,
      );

      expect(requiredPermissions).toEqual(['users.read']);
    });
  });

  describe('findCustomer', () => {
  it('should retrieve a customer for the specified business', async () => {
    const fakeCustomer = {
      id: 'customer-123',
      businessId: 'business-123',
      name: 'John Doe',
    };

    mockBusinessService.findCustomer.mockResolvedValue(
    fakeCustomer,
    );

    const result = await controller.findCustomer(
      'business-123',
      'customer-123',
    );

    expect(mockBusinessService.findCustomer).toHaveBeenCalledWith(
      'business-123',
      'customer-123',
    );

    expect(result).toEqual(fakeCustomer);
  });

  it('should require the customers.read permission', () => {
    const permissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      BusinessController.prototype.findCustomer,
    );

    expect(permissions).toContain('customers.read');
  });
});

  describe('updateCustomer', () => {
    it('should update a customer for the specified business', async () => {
      const dto = {
        name: 'John Updated',
        phone: '0798765432',
      };

      const updatedCustomer = {
        id: 'customer-123',
        businessId: 'business-123',
        name: 'John Updated',
        phone: '0798765432',
      };

      mockBusinessService.updateCustomer.mockResolvedValue({
        message: 'Customer updated successfully.',
        customer: updatedCustomer,
      });

      const result = await controller.updateCustomer(
        'business-123',
        'customer-123',
        dto,
      );

      expect(
        mockBusinessService.updateCustomer,
      ).toHaveBeenCalledWith(
        'business-123',
        'customer-123',
        dto,
      );

      expect(result.customer).toEqual(updatedCustomer);
    });

    it('should require the customers.update permission', () => {
      const permissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        BusinessController.prototype.updateCustomer,
      );

      expect(permissions).toContain('customers.update');
    });
  });

  describe('findRoles', () => {
    it('should retrieve roles for the specified business', async () => {
      const fakeRoles = [
        {
          id: 'role-123',
          name: 'Sales',
          key: 'SALES',
        },
      ];

      mockBusinessService.findRoles.mockResolvedValue(fakeRoles);

      const result = await controller.findRoles('business-123');

      expect(mockBusinessService.findRoles).toHaveBeenCalledWith(
        'business-123',
      );

      expect(result).toEqual(fakeRoles);
    });

    it('should require the roles.read permission', () => {
      const requiredPermissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        BusinessController.prototype.findRoles,
      );

      expect(requiredPermissions).toEqual(['roles.read']);
    });
  });

  describe('createRole', () => {
    it('should create a custom role for the specified business', async () => {
      const dto = {
        name: 'Supervisor',
        permissions: ['sales.read', 'sales.create'],
      };

      const fakeResult = {
        message: 'Custom role created successfully.',
        role: {
          id: 'role-supervisor',
          name: 'Supervisor',
          key: 'SUPERVISOR',
          isSystem: false,
        },
        permissions: ['sales.read', 'sales.create'],
      };

      mockBusinessService.createRole.mockResolvedValue(fakeResult);

      const result = await controller.createRole(
        'business-123',
        dto,
      );

      expect(mockBusinessService.createRole).toHaveBeenCalledWith(
        'business-123',
        dto,
      );

      expect(result).toEqual(fakeResult);
    });

    it('should require the roles.manage permission', () => {
      const requiredPermissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        BusinessController.prototype.createRole,
      );

      expect(requiredPermissions).toEqual(['roles.manage']);
    });
  });

  describe('createCustomer', () => {
    it('should create a customer for the specified business', async () => {
      const dto = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '0712345678',
        address: 'Nairobi',
      };

      const fakeResult = {
        message: 'Customer created successfully.',
        customer: {
          id: 'customer-123',
          businessId: 'business-123',
          ...dto,
        },
      };

      mockBusinessService.createCustomer.mockResolvedValue(fakeResult);

      const result = await controller.createCustomer(
        'business-123',
        dto,
      );

      expect(mockBusinessService.createCustomer).toHaveBeenCalledWith(
        'business-123',
        dto,
      );

      expect(result).toEqual(fakeResult);
    });

    it('should require the customers.create permission', () => {
      const requiredPermissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        BusinessController.prototype.createCustomer,
      );

      expect(requiredPermissions).toEqual(['customers.create']);
    });
  });

  describe('findCustomers', () => {
    it('should retrieve customers for the specified business', async () => {
      const fakeCustomers = [
        {
          id: 'customer-123',
          businessId: 'business-123',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '0712345678',
          address: 'Nairobi',
        },
      ];

      mockBusinessService.findCustomers.mockResolvedValue(
        fakeCustomers,
      );

      const result = await controller.findCustomers(
        'business-123',
      );

      expect(
        mockBusinessService.findCustomers,
      ).toHaveBeenCalledWith('business-123');

      expect(result).toEqual(fakeCustomers);
    });

    it('should require the customers.read permission', () => {
      const requiredPermissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        BusinessController.prototype.findCustomers,
      );

      expect(requiredPermissions).toEqual(['customers.read']);
    });
  });
});
