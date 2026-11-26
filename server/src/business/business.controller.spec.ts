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
    findMyBusinesses: vi.fn(),
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
});
