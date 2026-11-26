
import {
  Body,
  Controller,
  Post,
  Param,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { BusinessService } from './business.service.js';
import { CreateBusinessDto } from './dto/create-business.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { BusinessMembershipGuard } from './guards/business-membership.guard.js';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
  };
}

@Controller('businesses')
@UseGuards(JwtAuthGuard)
export class BusinessController {
  constructor(
    private readonly businessService: BusinessService,
  ) {}

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateBusinessDto,
  ) {
    return this.businessService.create(
      request.user.userId,
      dto,
    );
  }

  @Get()
findMyBusinesses(@Req() request: AuthenticatedRequest) {
  return this.businessService.findMyBusinesses(
    request.user.userId,
  );
}

@Get(':businessId')
@UseGuards(BusinessMembershipGuard)
getBusiness(
  @Param('businessId') businessId: string,
) {
  return this.businessService.findOne(businessId);
}

}
