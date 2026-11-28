
export const SYSTEM_PERMISSIONS = [
  { key: 'business.read', name: 'View business' },
  { key: 'business.update', name: 'Update business' },

  { key: 'users.read', name: 'View users' },
  { key: 'users.manage', name: 'Manage users' },

  { key: 'roles.read', name: 'View roles' },
  { key: 'roles.manage', name: 'Manage roles' },

  { key: 'customers.create', name: 'Create customers' },
  { key: 'customers.read', name: 'View customers' },
  { key: 'customers.update', name: 'Update customers' },
  { key: 'customers.delete', name: 'Delete customers' },

  { key: 'categories.create', name: 'Create categories' },
  { key: 'categories.read', name: 'View categories' },
  { key: 'categories.update', name: 'Update categories' },
  { key: 'categories.delete', name: 'Delete categories' },

  { key: 'products.create', name: 'Create products' },
  { key: 'products.read', name: 'View products' },
  { key: 'products.update', name: 'Update products' },
  { key: 'products.delete', name: 'Delete products' },

  { key: 'inventory.read', name: 'View inventory' },
  { key: 'inventory.adjust', name: 'Adjust inventory' },

  { key: 'inventory.locations.create', name: 'Create stock locations' },
  { key: 'inventory.locations.read', name: 'View stock locations' },
  { key: 'inventory.locations.update', name: 'Update stock locations' },
  { key: 'inventory.locations.delete', name: 'Delete stock locations' },

  { key: 'inventory.stock.read', name: 'View stock balances' },
  { key: 'inventory.stock.adjust', name: 'Adjust stock quantities' },
  { key: 'inventory.stock.transfer', name: 'Transfer stock between locations' },

  { key: 'inventory.movements.read', name: 'View stock movement history' },

  { key: 'sales.create', name: 'Create sales' },
  { key: 'sales.read', name: 'View sales' },
  { key: 'sales.update', name: 'Update sales' },
  { key: 'sales.cancel', name: 'Cancel sales' },

  { key: 'payments.create', name: 'Record payments' },
  { key: 'payments.read', name: 'View payments' },
  { key: 'payments.refund', name: 'Refund payments' },

  { key: 'expenses.create', name: 'Create expenses' },
  { key: 'expenses.read', name: 'View expenses' },
  { key: 'expenses.update', name: 'Update expenses' },
  { key: 'expenses.delete', name: 'Delete expenses' },

  { key: 'reports.read', name: 'View reports' },
] as const;

const ALL_PERMISSION_KEYS = SYSTEM_PERMISSIONS.map(
  (permission) => permission.key,
);

export const ROLE_PERMISSION_KEYS = {
  OWNER: [...ALL_PERMISSION_KEYS],

  ADMIN: ALL_PERMISSION_KEYS.filter(
    (key) => key !== 'users.manage' && key !== 'roles.manage',
  ),

  MANAGER: [
    'business.read',
    'users.read',
    'customers.create',
    'customers.read',
    'customers.update',
    'customers.delete',
    'products.read',
    'products.update',
    'inventory.read',
    'inventory.adjust',
    'inventory.locations.create',
    'inventory.locations.read',
    'inventory.locations.update',
    'inventory.locations.delete',
    'inventory.stock.read',
    'inventory.stock.adjust',
    'inventory.stock.transfer',
    'inventory.movements.read',
    'sales.create',
    'sales.read',
    'sales.update',
    'sales.cancel',
    'payments.create',
    'payments.read',
    'expenses.create',
    'expenses.read',
    'expenses.update',
    'reports.read',
  ],

  SALES: [
    'customers.create',
    'customers.read',
    'customers.update',
    'products.read',
    'inventory.read',
    'inventory.stock.read',
    'sales.create',
    'sales.read',
    'sales.update',
    'payments.create',
    'payments.read',
  ],

  STOCK_MANAGER: [
    'products.create',
    'products.read',
    'products.update',
    'inventory.read',
    'inventory.adjust',
    'inventory.locations.create',
    'inventory.locations.read',
    'inventory.locations.update',
    'inventory.stock.read',
    'inventory.stock.adjust',
    'inventory.stock.transfer',
    'inventory.movements.read',
    'sales.read',
  ],

  ACCOUNTANT: [
    'business.read',
    'customers.read',
    'products.read',
    'inventory.read',
    'inventory.stock.read',
    'inventory.movements.read',
    'sales.read',
    'payments.read',
    'payments.refund',
    'expenses.create',
    'expenses.read',
    'expenses.update',
    'expenses.delete',
    'reports.read',
  ],
} as const;
