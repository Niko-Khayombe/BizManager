
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service.js';

interface BusinessMembershipContext {
  id: string;
  role: {
    key: string;
    name: string;
  };
}

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
  params: {
    businessId?: string;
  };
  businessMembership?: BusinessMembershipContext;
}

@Injectable()
export class BusinessMembershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();

    const user = request.user;
    const businessId = request.params.businessId;

    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }

    if (!businessId) {
      throw new ForbiddenException('Business ID is required.');
    }

    const membership = await this.prisma.businessMembership.findUnique({
      where: {
        businessId_userId: {
          businessId,
          userId: user.userId,
        },
      },
      select: {
        id: true,
        role: {
          select: {
            key: true,
            name: true,
          },
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'You do not have access to this business.',
      );
    }

    request.businessMembership = membership;

    return true;
  }
}
