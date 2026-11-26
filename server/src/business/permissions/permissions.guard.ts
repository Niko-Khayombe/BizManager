import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PERMISSIONS_KEY } from './permissions.decorator.js';

interface AuthenticatedRequest extends Request {
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
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<
      string[]
    >(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Allow endpoints that don't declare specific permissions.
    if (!requiredPermissions?.length) {
      return true;
    }

    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();

    const businessId = request.params.businessId;
    const membership = request.businessMembership;

    if (!businessId || !membership) {
      throw new ForbiddenException(
        'Business membership is required.',
      );
    }

    const assignments = await this.prisma.rolePermission.findMany({
      where: {
        businessId,
        roleId: membership.role.id,
      },
      select: {
        permission: {
          select: {
            key: true,
          },
        },
      },
    });

    const grantedPermissions = new Set(
      assignments.map((assignment) => assignment.permission.key),
    );

    const missingPermissions = requiredPermissions.filter(
      (permission) => !grantedPermissions.has(permission),
    );

    if (missingPermissions.length > 0) {
      throw new ForbiddenException(
        `Missing required permission(s): ${missingPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
