import { PrismaService } from '../prisma/prisma.service.js';
import { Test, TestingModule } from '@nestjs/testing';
import { BusinessController } from './business.controller.js';
import { BusinessService } from './business.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { BusinessMembershipGuard } from './guards/business-membership.guard.js';
import { vi } from 'vitest';

describe('BusinessController', () => {
  let controller: BusinessController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BusinessController],
      providers: [
        {
          provide: BusinessService,
          useValue: {},
        },
        {
          provide: JwtAuthGuard,
          useValue: { canActivate: () => true },
        },
        {
          provide: BusinessMembershipGuard,
          useValue: { canActivate: () => true },
        },
{
  provide: PrismaService,
  useValue: {
    businessMembership: {
      findUnique: vi.fn(),
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
});

