
import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import {
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { BusinessMembershipGuard } from './business-membership.guard.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { ExecutionContext } from '@nestjs/common';

describe('BusinessMembershipGuard', () => {
  let guard: BusinessMembershipGuard;

  const mockPrisma = {
    businessMembership: {
      findUnique: vi.fn(),
    },
  };

  const mockRequest: {
    user?: {
      userId: string;
      email: string;
    };
    params: {
      businessId?: string;
    };
    businessMembership?: {
      id: string;
      role: {
        id: string;
        key: string;
        name: string;
      };
    };
  } = {
    user: {
      userId: 'user-123',
      email: 'owner@example.com',
    },
    params: {
      businessId: 'business-123',
    },
  };

  const mockExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
    }),
  } as unknown as ExecutionContext;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockRequest.user = {
      userId: 'user-123',
      email: 'owner@example.com',
    };

    mockRequest.params = {
      businessId: 'business-123',
    };

    mockRequest.businessMembership = undefined;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessMembershipGuard,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    guard = module.get<BusinessMembershipGuard>(
      BusinessMembershipGuard,
    );
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow a user who belongs to the business', async () => {
    mockPrisma.businessMembership.findUnique.mockResolvedValue({
      id: 'membership-123',
      role: {
        id: 'role-123',
        key: 'OWNER',
        name: 'Owner',
      },
    });

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);

    expect(
      mockPrisma.businessMembership.findUnique,
    ).toHaveBeenCalledWith({
      where: {
        businessId_userId: {
          businessId: 'business-123',
          userId: 'user-123',
        },
      },
      select: {
        id: true,
        role: {
          select: {
            id: true,
            key: true,
            name: true,
          },
        },
      },
    });

    expect(mockRequest).toHaveProperty('businessMembership', {
      id: 'membership-123',
      role: {
        id: 'role-123',
        key: 'OWNER',
        name: 'Owner',
      },
    });
  });

  it('should reject a user who is not a member', async () => {
    mockPrisma.businessMembership.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(mockExecutionContext),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should reject a request without an authenticated user', async () => {
    mockRequest.user = undefined;

    await expect(
      guard.canActivate(mockExecutionContext),
    ).rejects.toThrow(UnauthorizedException);

    expect(
      mockPrisma.businessMembership.findUnique,
    ).not.toHaveBeenCalled();
  });

  it('should reject a request without a business ID', async () => {
    mockRequest.params.businessId = undefined;

    await expect(
      guard.canActivate(mockExecutionContext),
    ).rejects.toThrow(ForbiddenException);

    expect(
      mockPrisma.businessMembership.findUnique,
    ).not.toHaveBeenCalled();
  });
});
