
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBusinessDto } from './dto/create-business.dto.js';

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
