import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard.js';
import { PERMISSIONS_KEY } from './permissions.decorator.js';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };
  let prisma: {
    rolePermission: {
      findMany: ReturnType<typeof vi.fn>;
    };
  };

  const createContext = () => {
    const request = {
      params: { businessId: 'business-123' },
      businessMembership: {
        id: 'membership-123',
        role: {
          id: 'role-123',
          key: 'OWNER',
          name: 'Owner',
        },
      },
    };

    return {
      request,
      context: {
        getHandler: vi.fn(),
        getClass: vi.fn(),
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as any,
    };
  };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: vi.fn(),
    };

    prisma = {
      rolePermission: {
        findMany: vi.fn(),
      },
    };

    guard = new PermissionsGuard(
      reflector as any,
      prisma as any,
    );
  });

  it('should allow endpoints without required permissions', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const { context } = createContext();

    await expect(
      guard.canActivate(context),
    ).resolves.toBe(true);

    expect(prisma.rolePermission.findMany).not.toHaveBeenCalled();
  });

  it('should allow a user with the required permission', async () => {
    reflector.getAllAndOverride.mockReturnValue([
      'business.read',
    ]);

    prisma.rolePermission.findMany.mockResolvedValue([
      {
        permission: { key: 'business.read' },
      },
    ]);

    const { context } = createContext();

    await expect(
      guard.canActivate(context),
    ).resolves.toBe(true);

    expect(prisma.rolePermission.findMany).toHaveBeenCalledWith({
      where: {
        businessId: 'business-123',
        roleId: 'role-123',
      },
      select: {
        permission: {
          select: {
            key: true,
          },
        },
      },
    });
  });

  it('should reject a user missing the required permission', async () => {
    reflector.getAllAndOverride.mockReturnValue([
      'users.manage',
    ]);

    prisma.rolePermission.findMany.mockResolvedValue([
      {
        permission: { key: 'business.read' },
      },
    ]);

    const { context } = createContext();

    await expect(
      guard.canActivate(context),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should reject requests without business membership', async () => {
    reflector.getAllAndOverride.mockReturnValue([
      'business.read',
    ]);

    const { context } = createContext();
    const request = context.switchToHttp().getRequest();
    request.businessMembership = undefined;

    await expect(
      guard.canActivate(context),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should check all required permissions', async () => {
    reflector.getAllAndOverride.mockReturnValue([
      'business.read',
      'business.update',
    ]);

    prisma.rolePermission.findMany.mockResolvedValue([
      {
        permission: { key: 'business.read' },
      },
    ]);

    const { context } = createContext();

    await expect(
      guard.canActivate(context),
    ).rejects.toThrow(ForbiddenException);
  });
});
