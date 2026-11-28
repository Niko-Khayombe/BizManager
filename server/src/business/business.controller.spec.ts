
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
    addMember: vi.fn(),
    createCustomer: vi.fn(),
    createProduct: vi.fn(),
    findCustomers: vi.fn(),
    findCustomer: vi.fn(),
    findCategories: vi.fn(),
    findCategory: vi.fn(),
    findProducts: vi.fn(),
    findProduct: vi.fn(),
    updateCategory: vi.fn(),
    updateProduct: vi.fn(),
    deleteCategory: vi.fn(),
    deleteProduct: vi.fn(),
    updateCustomer: vi.fn(),
    deleteCustomer: vi.fn(),
    createRole: vi.fn(),
    updateMemberRole: vi.fn(),
    findRoles: vi.fn(),
    findMyBusinesses: vi.fn(),
    removeMember: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    createCategory: vi.fn(),
    createStockLocation: vi.fn(),
    findStockLocations: vi.fn(),
    findStockLocation: vi.fn(),
    updateStockLocation: vi.fn(),
    deleteStockLocation: vi.fn(),
    receiveStock: vi.fn(),
    issueStock: vi.fn(),
    adjustStock: vi.fn(),
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

  describe('addMember', () => {
    it('should add a member to the specified business', async () => {
      const dto = {
        email: 'jane@example.com',
        roleId: 'role-sales',
      };

      const fakeResult = {
        message: 'Team member added successfully.',
        membership: {
          membershipId: 'membership-456',
          user: {
            id: 'user-456',
            name: 'Jane Doe',
            email: 'jane@example.com',
          },
          role: {
            id: 'role-sales',
            name: 'Sales',
            key: 'SALES',
          },
        },
      };

      mockBusinessService.addMember.mockResolvedValue(fakeResult);

      const result = await controller.addMember(
        'business-123',
        dto,
      );

      expect(mockBusinessService.addMember).toHaveBeenCalledWith(
        'business-123',
        dto,
      );

      expect(result).toEqual(fakeResult);
    });

    it('should require the users.manage permission', () => {
      const requiredPermissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        BusinessController.prototype.addMember,
      );

      expect(requiredPermissions).toEqual(['users.manage']);
    });
  });

  describe('updateMemberRole', () => {
    it('should update a member role in the specified business', async () => {
      const dto = {
        roleId: 'role-manager',
      };

      const fakeResult = {
        message: 'Team member role updated successfully.',
        membership: {
          membershipId: 'membership-456',
          user: {
            id: 'user-456',
            name: 'Jane Doe',
            email: 'jane@example.com',
          },
          role: {
            id: 'role-manager',
            name: 'Manager',
            key: 'MANAGER',
          },
        },
      };

      mockBusinessService.updateMemberRole.mockResolvedValue(fakeResult);

      const result = await controller.updateMemberRole(
        'business-123',
        'membership-456',
        dto,
      );

      expect(mockBusinessService.updateMemberRole).toHaveBeenCalledWith(
        'business-123',
        'membership-456',
        dto,
      );

      expect(result).toEqual(fakeResult);
    });

    it('should require the users.manage permission', () => {
      const requiredPermissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        BusinessController.prototype.updateMemberRole,
      );

      expect(requiredPermissions).toEqual(['users.manage']);
    });
  });

  describe('removeMember', () => {
    it('should remove a member from the specified business', async () => {
      const fakeResult = {
        message: 'Team member removed successfully.',
        member: {
          name: 'Jane Doe',
          email: 'jane@example.com',
        },
      };

      mockBusinessService.removeMember.mockResolvedValue(fakeResult);

      const result = await controller.removeMember(
        'business-123',
        'membership-456',
      );

      expect(mockBusinessService.removeMember).toHaveBeenCalledWith(
        'business-123',
        'membership-456',
      );

      expect(result).toEqual(fakeResult);
    });

    it('should require the users.manage permission', () => {
      const requiredPermissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        BusinessController.prototype.removeMember,
      );

      expect(requiredPermissions).toEqual(['users.manage']);
    });
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

  describe('findCustomer', () => {
  it('should retrieve a customer for the specified business', async () => {
    const fakeCustomer = {
      id: 'customer-123',
      businessId: 'business-123',
      name: 'John Doe',
    };

    mockBusinessService.findCustomer.mockResolvedValue(
    fakeCustomer,
    );

    const result = await controller.findCustomer(
      'business-123',
      'customer-123',
    );

    expect(mockBusinessService.findCustomer).toHaveBeenCalledWith(
      'business-123',
      'customer-123',
    );

    expect(result).toEqual(fakeCustomer);
  });

  it('should require the customers.read permission', () => {
    const permissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      BusinessController.prototype.findCustomer,
    );

    expect(permissions).toContain('customers.read');
  });
});

  describe('updateCustomer', () => {
    it('should update a customer for the specified business', async () => {
      const dto = {
        name: 'John Updated',
        phone: '0798765432',
      };

      const updatedCustomer = {
        id: 'customer-123',
        businessId: 'business-123',
        name: 'John Updated',
        phone: '0798765432',
      };

      mockBusinessService.updateCustomer.mockResolvedValue({
        message: 'Customer updated successfully.',
        customer: updatedCustomer,
      });

      const result = await controller.updateCustomer(
        'business-123',
        'customer-123',
        dto,
      );

      expect(
        mockBusinessService.updateCustomer,
      ).toHaveBeenCalledWith(
        'business-123',
        'customer-123',
        dto,
      );

      expect(result.customer).toEqual(updatedCustomer);
    });

    it('should require the customers.update permission', () => {
      const permissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        BusinessController.prototype.updateCustomer,
      );

      expect(permissions).toContain('customers.update');
    });
  });

    describe('deleteCustomer', () => {
    it('should delete a customer for the specified business', async () => {
      mockBusinessService.deleteCustomer.mockResolvedValue({
        message: 'Customer deleted successfully.',
      });

      const result = await controller.deleteCustomer(
        'business-123',
        'customer-123',
      );

      expect(
        mockBusinessService.deleteCustomer,
      ).toHaveBeenCalledWith(
        'business-123',
        'customer-123',
      );

      expect(result).toEqual({
        message: 'Customer deleted successfully.',
      });
    });

    it('should require the customers.delete permission', () => {
      const permissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        BusinessController.prototype.deleteCustomer,
      );

      expect(permissions).toContain('customers.delete');
    });
  });

  describe('findRoles', () => {
    it('should retrieve roles for the specified business', async () => {
      const fakeRoles = [
        {
          id: 'role-123',
          name: 'Sales',
          key: 'SALES',
        },
      ];

      mockBusinessService.findRoles.mockResolvedValue(fakeRoles);

      const result = await controller.findRoles('business-123');

      expect(mockBusinessService.findRoles).toHaveBeenCalledWith(
        'business-123',
      );

      expect(result).toEqual(fakeRoles);
    });

    it('should require the roles.read permission', () => {
      const requiredPermissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        BusinessController.prototype.findRoles,
      );

      expect(requiredPermissions).toEqual(['roles.read']);
    });
  });

  describe('createRole', () => {
    it('should create a custom role for the specified business', async () => {
      const dto = {
        name: 'Supervisor',
        permissions: ['sales.read', 'sales.create'],
      };

      const fakeResult = {
        message: 'Custom role created successfully.',
        role: {
          id: 'role-supervisor',
          name: 'Supervisor',
          key: 'SUPERVISOR',
          isSystem: false,
        },
        permissions: ['sales.read', 'sales.create'],
      };

      mockBusinessService.createRole.mockResolvedValue(fakeResult);

      const result = await controller.createRole(
        'business-123',
        dto,
      );

      expect(mockBusinessService.createRole).toHaveBeenCalledWith(
        'business-123',
        dto,
      );

      expect(result).toEqual(fakeResult);
    });

    it('should require the roles.manage permission', () => {
      const requiredPermissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        BusinessController.prototype.createRole,
      );

      expect(requiredPermissions).toEqual(['roles.manage']);
    });
  });

  describe('createCustomer', () => {
    it('should create a customer for the specified business', async () => {
      const dto = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '0712345678',
        address: 'Nairobi',
      };

      const fakeResult = {
        message: 'Customer created successfully.',
        customer: {
          id: 'customer-123',
          businessId: 'business-123',
          ...dto,
        },
      };

      mockBusinessService.createCustomer.mockResolvedValue(fakeResult);

      const result = await controller.createCustomer(
        'business-123',
        dto,
      );

      expect(mockBusinessService.createCustomer).toHaveBeenCalledWith(
        'business-123',
        dto,
      );

      expect(result).toEqual(fakeResult);
    });

    it('should require the customers.create permission', () => {
      const requiredPermissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        BusinessController.prototype.createCustomer,
      );

      expect(requiredPermissions).toEqual(['customers.create']);
    });
  });

  describe('findCustomers', () => {
    it('should retrieve customers for the specified business', async () => {
      const fakeCustomers = [
        {
          id: 'customer-123',
          businessId: 'business-123',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '0712345678',
          address: 'Nairobi',
        },
      ];

      mockBusinessService.findCustomers.mockResolvedValue(
        fakeCustomers,
      );

      const result = await controller.findCustomers(
        'business-123',
      );

      expect(
        mockBusinessService.findCustomers,
      ).toHaveBeenCalledWith('business-123');

      expect(result).toEqual(fakeCustomers);
    });

    it('should require the customers.read permission', () => {
      const requiredPermissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        BusinessController.prototype.findCustomers,
      );

      expect(requiredPermissions).toEqual(['customers.read']);
    });
  });

  describe('createProduct', () => {
  it('should create a product for the specified business', async () => {
    const dto = {
      name: 'Laptop',
      sku: 'LAP-001',
      sellingPrice: 75000,
    };

    const expectedResult = {
      message: 'Product created successfully.',
      product: { id: 'product-123', ...dto },
    };

    mockBusinessService.createProduct.mockResolvedValue(
      expectedResult,
    );

    const result = await controller.createProduct(
      'business-123',
      dto,
    );

    expect(mockBusinessService.createProduct).toHaveBeenCalledWith(
      'business-123',
      dto,
    );
    expect(result).toEqual(expectedResult);
  });

  it('should require products.create permission', () => {
    const permissions = Reflect.getMetadata(
      'required_permissions',
      BusinessController.prototype.createProduct,
    );

    expect(permissions).toContain('products.create');
  });
});

describe('findProducts', () => {
  it('should retrieve products for the specified business', async () => {
    const fakeProducts = [
      {
        id: 'product-123',
        name: 'Laptop',
        sku: 'LAP-001',
      },
    ];

    mockBusinessService.findProducts.mockResolvedValue(
      fakeProducts,
    );

    const result = await controller.findProducts(
      'business-123',
    );

    expect(mockBusinessService.findProducts).toHaveBeenCalledWith(
      'business-123',
    );

    expect(result).toEqual(fakeProducts);
  });

  it('should require products.read permission', () => {
    const permissions = Reflect.getMetadata(
      'required_permissions',
      BusinessController.prototype.findProducts,
    );

    expect(permissions).toContain('products.read');
  });
});

describe('findProduct', () => {
  it('should retrieve a product for the specified business', async () => {
    const fakeProduct = {
      id: 'product-123',
      name: 'Laptop',
      sku: 'LAP-001',
    };

    mockBusinessService.findProduct.mockResolvedValue(fakeProduct);

    const result = await controller.findProduct(
      'business-123',
      'product-123',
    );

    expect(mockBusinessService.findProduct).toHaveBeenCalledWith(
      'business-123',
      'product-123',
    );

    expect(result).toEqual(fakeProduct);
  });

  it('should require products.read permission', () => {
    const permissions = Reflect.getMetadata(
      'required_permissions',
      BusinessController.prototype.findProduct,
    );

    expect(permissions).toContain('products.read');
  });
});

describe('updateProduct', () => {
  it('should update a product for the specified business', async () => {
    const dto = {
      name: 'Updated Laptop',
      sellingPrice: 65000,
    };

    const expectedResult = {
      message: 'Product updated successfully.',
      product: {
        id: 'product-123',
        ...dto,
      },
    };

    mockBusinessService.updateProduct.mockResolvedValue(
      expectedResult,
    );

    const result = await controller.updateProduct(
      'business-123',
      'product-123',
      dto,
    );

    expect(mockBusinessService.updateProduct).toHaveBeenCalledWith(
      'business-123',
      'product-123',
      dto,
    );

    expect(result).toEqual(expectedResult);
  });

  it('should require products.update permission', () => {
    const permissions = Reflect.getMetadata(
      'required_permissions',
      BusinessController.prototype.updateProduct,
    );

    expect(permissions).toContain('products.update');
  });
});

describe('deleteProduct', () => {
  it('should delete a product for the specified business', async () => {
    const expectedResult = {
      message: 'Product deleted successfully.',
    };

    mockBusinessService.deleteProduct.mockResolvedValue(
      expectedResult,
    );

    const result = await controller.deleteProduct(
      'business-123',
      'product-123',
    );

    expect(mockBusinessService.deleteProduct).toHaveBeenCalledWith(
      'business-123',
      'product-123',
    );

    expect(result).toEqual(expectedResult);
  });

  it('should require products.delete permission', () => {
    const permissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      BusinessController.prototype.deleteProduct,
    );

    expect(permissions).toEqual(['products.delete']);
  });
});

  describe('createCategory', () => {
  it('should create a category for the specified business', async () => {
    const dto = {
      name: 'Electronics',
      description: 'Electronic products',
    };

    const fakeResult = {
      message: 'Category created successfully.',
      category: {
        id: 'category-123',
        businessId: 'business-123',
        ...dto,
      },
    };

    mockBusinessService.createCategory.mockResolvedValue(fakeResult);

    const result = await controller.createCategory(
      'business-123',
      dto,
    );

    expect(mockBusinessService.createCategory).toHaveBeenCalledWith(
      'business-123',
      dto,
    );

    expect(result).toEqual(fakeResult);
  });

  it('should require the categories.create permission', () => {
    const requiredPermissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      BusinessController.prototype.createCategory,
    );

    expect(requiredPermissions).toEqual(['categories.create']);
  });
});
  describe('findCategories', () => {
    it('should return categories for the specified business', async () => {
      const fakeCategories = [
        {
          id: 'category-123',
          businessId: 'business-123',
          name: 'Electronics',
        },
        {
          id: 'category-456',
          businessId: 'business-123',
          name: 'Furniture',
        },
      ];

      mockBusinessService.findCategories.mockResolvedValue(
        fakeCategories,
      );

      const result = await controller.findCategories(
        'business-123',
      );

      expect(
        mockBusinessService.findCategories,
      ).toHaveBeenCalledWith('business-123');

      expect(result).toEqual(fakeCategories);
    });

    it('should require the categories.read permission', () => {
      const requiredPermissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        BusinessController.prototype.findCategories,
      );

      expect(requiredPermissions).toEqual(['categories.read']);
    });
  });

    describe('findCategory', () => {
    it('should retrieve a category for the specified business', async () => {
      const fakeCategory = {
        id: 'category-123',
        businessId: 'business-123',
        name: 'Electronics',
        description: 'Electronic products',
      };

      mockBusinessService.findCategory.mockResolvedValue(fakeCategory);

      const result = await controller.findCategory(
        'business-123',
        'category-123',
      );

      expect(mockBusinessService.findCategory).toHaveBeenCalledWith(
        'business-123',
        'category-123',
      );

      expect(result).toEqual(fakeCategory);
    });

    it('should require the categories.read permission', () => {
      const requiredPermissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        BusinessController.prototype.findCategory,
      );

      expect(requiredPermissions).toEqual(['categories.read']);
    });
  });

  describe('updateCategory', () => {
  it('should update a category for the specified business', async () => {
    const dto = {
      name: 'Computers',
      description: 'Computer accessories',
    };

    const fakeResult = {
      message: 'Category updated successfully.',
      category: {
        id: 'category-123',
        businessId: 'business-123',
        name: 'Computers',
        description: 'Computer accessories',
      },
    };

    mockBusinessService.updateCategory.mockResolvedValue(fakeResult);

    const result = await controller.updateCategory(
      'business-123',
      'category-123',
      dto,
    );

    expect(mockBusinessService.updateCategory).toHaveBeenCalledWith(
      'business-123',
      'category-123',
      dto,
    );

    expect(result).toEqual(fakeResult);
  });

  it('should require the categories.update permission', () => {
    const requiredPermissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      BusinessController.prototype.updateCategory,
    );

    expect(requiredPermissions).toEqual(['categories.update']);
  });
});

describe('deleteCategory', () => {
  it('should delete a category from the specified business', async () => {
    const fakeResult = {
      message: 'Category deleted successfully.',
    };

    mockBusinessService.deleteCategory.mockResolvedValue(fakeResult);

    const result = await controller.deleteCategory(
      'business-123',
      'category-123',
    );

    expect(mockBusinessService.deleteCategory).toHaveBeenCalledWith(
      'business-123',
      'category-123',
    );

    expect(result).toEqual(fakeResult);
  });

  it('should require the categories.delete permission', () => {
    const requiredPermissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      BusinessController.prototype.deleteCategory,
    );

    expect(requiredPermissions).toEqual(['categories.delete']);
  });
});
  describe('stock location endpoints', () => {
    it('should create a stock location', async () => {
      const dto = {
        name: 'Main Warehouse',
        description: 'Primary storage',
      };

      const fakeResult = {
        message: 'Stock location created successfully.',
        location: {
          id: 'location-123',
          name: 'Main Warehouse',
        },
      };

      mockBusinessService.createStockLocation.mockResolvedValue(fakeResult);

      const result = await controller.createStockLocation(
        'business-123',
        dto,
      );

      expect(mockBusinessService.createStockLocation).toHaveBeenCalledWith(
        'business-123',
        dto,
      );
      expect(result).toEqual(fakeResult);
    });

    it('should list stock locations', async () => {
      const locations = [
        { id: 'location-123', name: 'Main Warehouse' },
      ];

      mockBusinessService.findStockLocations.mockResolvedValue(locations);

      const result = await controller.findStockLocations('business-123');

      expect(mockBusinessService.findStockLocations).toHaveBeenCalledWith(
        'business-123',
      );
      expect(result).toEqual(locations);
    });

    it('should retrieve one stock location', async () => {
      const location = {
        id: 'location-123',
        name: 'Main Warehouse',
      };

      mockBusinessService.findStockLocation.mockResolvedValue(location);

      const result = await controller.findStockLocation(
        'business-123',
        'location-123',
      );

      expect(mockBusinessService.findStockLocation).toHaveBeenCalledWith(
        'business-123',
        'location-123',
      );
      expect(result).toEqual(location);
    });

    it('should update a stock location', async () => {
      const dto = { name: 'Updated Warehouse' };
      const fakeResult = {
        message: 'Stock location updated successfully.',
      };

      mockBusinessService.updateStockLocation.mockResolvedValue(fakeResult);

      const result = await controller.updateStockLocation(
        'business-123',
        'location-123',
        dto,
      );

      expect(mockBusinessService.updateStockLocation).toHaveBeenCalledWith(
        'business-123',
        'location-123',
        dto,
      );
      expect(result).toEqual(fakeResult);
    });

    it('should delete a stock location', async () => {
      const fakeResult = {
        message: 'Stock location deleted successfully.',
      };

      mockBusinessService.deleteStockLocation.mockResolvedValue(fakeResult);

      const result = await controller.deleteStockLocation(
        'business-123',
        'location-123',
      );

      expect(mockBusinessService.deleteStockLocation).toHaveBeenCalledWith(
        'business-123',
        'location-123',
      );
      expect(result).toEqual(fakeResult);
    });

    it('should require the correct permissions', () => {
      expect(
        Reflect.getMetadata(
          PERMISSIONS_KEY,
          BusinessController.prototype.createStockLocation,
        ),
      ).toEqual(['inventory.locations.create']);

      expect(
        Reflect.getMetadata(
          PERMISSIONS_KEY,
          BusinessController.prototype.findStockLocations,
        ),
      ).toEqual(['inventory.locations.read']);

      expect(
        Reflect.getMetadata(
          PERMISSIONS_KEY,
          BusinessController.prototype.findStockLocation,
        ),
      ).toEqual(['inventory.locations.read']);

      expect(
        Reflect.getMetadata(
          PERMISSIONS_KEY,
          BusinessController.prototype.updateStockLocation,
        ),
      ).toEqual(['inventory.locations.update']);

      expect(
        Reflect.getMetadata(
          PERMISSIONS_KEY,
          BusinessController.prototype.deleteStockLocation,
        ),
      ).toEqual(['inventory.locations.delete']);
    });
  });

    describe('stock transaction endpoints', () => {
    it('should receive stock', async () => {
      const dto = {
        productId: 'product-123',
        locationId: 'location-123',
        quantity: 10,
      };

      const fakeResult = {
        message: 'Stock received successfully.',
      };

      mockBusinessService.receiveStock.mockResolvedValue(fakeResult);

      const result = await controller.receiveStock('business-123', dto);

      expect(mockBusinessService.receiveStock).toHaveBeenCalledWith(
        'business-123',
        dto,
      );
      expect(result).toEqual(fakeResult);
    });

    it('should issue stock', async () => {
      const dto = {
        productId: 'product-123',
        locationId: 'location-123',
        quantity: 5,
      };

      const fakeResult = {
        message: 'Stock issued successfully.',
      };

      mockBusinessService.issueStock.mockResolvedValue(fakeResult);

      const result = await controller.issueStock('business-123', dto);

      expect(mockBusinessService.issueStock).toHaveBeenCalledWith(
        'business-123',
        dto,
      );
      expect(result).toEqual(fakeResult);
    });

    it('should adjust stock', async () => {
      const dto = {
        productId: 'product-123',
        locationId: 'location-123',
        newQuantity: 15,
      };

      const fakeResult = {
        message: 'Stock adjusted successfully.',
      };

      mockBusinessService.adjustStock.mockResolvedValue(fakeResult);

      const result = await controller.adjustStock('business-123', dto);

      expect(mockBusinessService.adjustStock).toHaveBeenCalledWith(
        'business-123',
        dto,
      );
      expect(result).toEqual(fakeResult);
    });

    it('should require the inventory.stock.adjust permission', () => {
      expect(
        Reflect.getMetadata(
          PERMISSIONS_KEY,
          BusinessController.prototype.receiveStock,
        ),
      ).toEqual(['inventory.stock.adjust']);

      expect(
        Reflect.getMetadata(
          PERMISSIONS_KEY,
          BusinessController.prototype.issueStock,
        ),
      ).toEqual(['inventory.stock.adjust']);

      expect(
        Reflect.getMetadata(
          PERMISSIONS_KEY,
          BusinessController.prototype.adjustStock,
        ),
      ).toEqual(['inventory.stock.adjust']);
    });
  });
});
