
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BusinessController } from './business.controller.js';
import { BusinessService } from './business.service.js';
import { BusinessMembershipGuard } from './guards/business-membership.guard.js';

@Module({
  imports: [AuthModule],
  controllers: [BusinessController],
  providers: [
    BusinessService,
    BusinessMembershipGuard,
  ],
  exports: [
    BusinessService,
    BusinessMembershipGuard,
  ],
})
export class BusinessModule {}
