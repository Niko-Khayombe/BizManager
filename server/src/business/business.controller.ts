import { UpdateProductDto } from './dto/update-product.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { CreateBusinessRoleDto } from './dto/create-business-role.dto.js';
import { UpdateBusinessMemberRoleDto } from './dto/update-business-member-role.dto.js';
import {
  Body,
  Controller,
  Delete,
  Post,
  Param,
  Patch,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { BusinessService } from './business.service.js';
import { AddBusinessMemberDto } from './dto/add-business-member.dto.js';
import { CreateBusinessDto } from './dto/create-business.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { BusinessMembershipGuard } from './guards/business-membership.guard.js';
import { PermissionsGuard } from './permissions/permissions.guard.js';
import { RequirePermissions } from './permissions/permissions.decorator.js';

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

  @Post(':businessId/members')
  @UseGuards(BusinessMembershipGuard, PermissionsGuard)
  @RequirePermissions('users.manage')
  addMember(
    @Param('businessId') businessId: string,
    @Body() dto: AddBusinessMemberDto,
  ) {
    return this.businessService.addMember(
      businessId,
      dto,
    );
  }

  @Patch(':businessId/members/:membershipId/role')
  @UseGuards(BusinessMembershipGuard, PermissionsGuard)
  @RequirePermissions('users.manage')
  updateMemberRole(
    @Param('businessId') businessId: string,
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdateBusinessMemberRoleDto,
  ) {
    return this.businessService.updateMemberRole(
      businessId,
      membershipId,
      dto,
    );
  }

  @Get(':businessId/members')
  @UseGuards(BusinessMembershipGuard, PermissionsGuard)
  @RequirePermissions('users.read')
  findMembers(
    @Param('businessId') businessId: string,
  ) {
    return this.businessService.findMembers(businessId);
  }

  @Get(':businessId/roles')
  @UseGuards(BusinessMembershipGuard, PermissionsGuard)
  @RequirePermissions('roles.read')
  findRoles(
    @Param('businessId') businessId: string,
  ) {
    return this.businessService.findRoles(businessId);
  }

@Post(':businessId/products')
@UseGuards(BusinessMembershipGuard, PermissionsGuard)
@RequirePermissions('products.create')
createProduct(
@Param('businessId') businessId: string,
@Body() dto: CreateProductDto,
) {
  return this.businessService.createProduct(businessId, dto);
}

@Get(':businessId/products')
@UseGuards(BusinessMembershipGuard, PermissionsGuard)
@RequirePermissions('products.read')
findProducts(
  @Param('businessId') businessId: string,
) {
  return this.businessService.findProducts(businessId);
}

@Get(':businessId/products/:productId')
@UseGuards(BusinessMembershipGuard, PermissionsGuard)
@RequirePermissions('products.read')
findProduct(
  @Param('businessId') businessId: string,
  @Param('productId') productId: string,
) {
  return this.businessService.findProduct(
    businessId,
    productId,
  );
}

@Patch(':businessId/products/:productId')
@UseGuards(BusinessMembershipGuard, PermissionsGuard)
@RequirePermissions('products.update')
updateProduct(
  @Param('businessId') businessId: string,
  @Param('productId') productId: string,
  @Body() dto: UpdateProductDto,
) {
  return this.businessService.updateProduct(
    businessId,
    productId,
    dto,
  );
}

@Delete(':businessId/products/:productId')
@UseGuards(BusinessMembershipGuard, PermissionsGuard)
@RequirePermissions('products.delete')
deleteProduct(
  @Param('businessId') businessId: string,
  @Param('productId') productId: string,
) {
  return this.businessService.deleteProduct(
    businessId,
    productId,
  );
}

@Post(':businessId/categories')
@UseGuards(BusinessMembershipGuard, PermissionsGuard)
@RequirePermissions('categories.create')
createCategory(
  @Param('businessId') businessId: string,
  @Body() dto: CreateCategoryDto,
) {
  return this.businessService.createCategory(businessId, dto);
}

  @Get(':businessId/categories')
  @UseGuards(BusinessMembershipGuard, PermissionsGuard)
  @RequirePermissions('categories.read')
  findCategories(
    @Param('businessId') businessId: string,
  ) {
    return this.businessService.findCategories(businessId);
  }

    @Get(':businessId/categories/:categoryId')
  @UseGuards(BusinessMembershipGuard, PermissionsGuard)
  @RequirePermissions('categories.read')
  findCategory(
    @Param('businessId') businessId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.businessService.findCategory(
      businessId,
      categoryId,
    );
  }

  @Patch(':businessId/categories/:categoryId')
@UseGuards(BusinessMembershipGuard, PermissionsGuard)
@RequirePermissions('categories.update')
updateCategory(
  @Param('businessId') businessId: string,
  @Param('categoryId') categoryId: string,
  @Body() dto: UpdateCategoryDto,
) {
  return this.businessService.updateCategory(
    businessId,
    categoryId,
    dto,
  );
}

@Delete(':businessId/categories/:categoryId')
@UseGuards(BusinessMembershipGuard, PermissionsGuard)
@RequirePermissions('categories.delete')
deleteCategory(
  @Param('businessId') businessId: string,
  @Param('categoryId') categoryId: string,
) {
  return this.businessService.deleteCategory(
    businessId,
    categoryId,
  );
}

  @Post(':businessId/customers')
  @UseGuards(BusinessMembershipGuard, PermissionsGuard)
  @RequirePermissions('customers.create')
  createCustomer(
    @Param('businessId') businessId: string,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.businessService.createCustomer(
      businessId,
      dto,
    );
  }

  @Get(':businessId/customers')
  @UseGuards(BusinessMembershipGuard, PermissionsGuard)
  @RequirePermissions('customers.read')
  findCustomers(
    @Param('businessId') businessId: string,
  ) {
    return this.businessService.findCustomers(businessId);
  }

    @Get(':businessId/customers/:customerId')
  @UseGuards(BusinessMembershipGuard, PermissionsGuard)
  @RequirePermissions('customers.read')
  findCustomer(
    @Param('businessId') businessId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.businessService.findCustomer(
      businessId,
      customerId,
    );
  }

  @Patch(':businessId/customers/:customerId')
  @UseGuards(BusinessMembershipGuard, PermissionsGuard)
  @RequirePermissions('customers.update')
  updateCustomer(
    @Param('businessId') businessId: string,
    @Param('customerId') customerId: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.businessService.updateCustomer(
      businessId,
      customerId,
      dto,
    );
  }

    @Delete(':businessId/customers/:customerId')
  @UseGuards(BusinessMembershipGuard, PermissionsGuard)
  @RequirePermissions('customers.delete')
  deleteCustomer(
    @Param('businessId') businessId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.businessService.deleteCustomer(
      businessId,
      customerId,
    );
  }

  @Post(':businessId/roles')
  @UseGuards(BusinessMembershipGuard, PermissionsGuard)
  @RequirePermissions('roles.manage')
  createRole(
    @Param('businessId') businessId: string,
    @Body() dto: CreateBusinessRoleDto,
  ) {
    return this.businessService.createRole(
      businessId,
      dto,
    );
  }

  @Delete(':businessId/members/:membershipId')
  @UseGuards(BusinessMembershipGuard, PermissionsGuard)
  @RequirePermissions('users.manage')
  removeMember(
    @Param('businessId') businessId: string,
    @Param('membershipId') membershipId: string,
  ) {
    return this.businessService.removeMember(
      businessId,
      membershipId,
    );
  }

  @Get(':businessId')
  @UseGuards(BusinessMembershipGuard, PermissionsGuard)
  @RequirePermissions('business.read')
  getBusiness(
    @Param('businessId') businessId: string,
  ) {
    return this.businessService.findOne(businessId);
  }
}
