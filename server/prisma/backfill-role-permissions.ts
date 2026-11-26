import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import {
  SYSTEM_PERMISSIONS,
  ROLE_PERMISSION_KEYS,
} from '../src/business/permissions/permissions.constants.ts';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    // Register missing system permissions.
    await tx.permission.createMany({
      data: [...SYSTEM_PERMISSIONS],
      skipDuplicates: true,
    });

    // Retrieve all registered permissions.
    const permissions = await tx.permission.findMany({
      where: {
        key: {
          in: SYSTEM_PERMISSIONS.map((permission) => permission.key),
        },
      },
      select: {
        id: true,
        key: true,
      },
    });

    const permissionIds = new Map(
      permissions.map((permission) => [
        permission.key,
        permission.id,
      ]),
    );

    if (permissionIds.size !== SYSTEM_PERMISSIONS.length) {
      throw new Error('Some system permissions are missing.');
    }

    // Find all existing businesses and their system roles.
    const businesses = await tx.business.findMany({
      include: {
        roles: {
          where: { isSystem: true },
        },
      },
    });

    const assignments = businesses.flatMap((business) =>
      business.roles.flatMap((role) => {
        const allowedKeys =
          ROLE_PERMISSION_KEYS[
            role.key as keyof typeof ROLE_PERMISSION_KEYS
          ];

        if (!allowedKeys) {
          throw new Error(
            `Unknown system role "${role.key}" in business "${business.name}".`,
          );
        }

        return allowedKeys.map((key) => {
          const permissionId = permissionIds.get(key);

          if (!permissionId) {
            throw new Error(`Permission "${key}" was not found.`);
          }

          return {
            businessId: business.id,
            roleId: role.id,
            permissionId,
          };
        });
      }),
    );

    // Create missing assignments without duplicating existing ones.
    const assignmentResult = await tx.rolePermission.createMany({
      data: assignments,
      skipDuplicates: true,
    });

    return {
      businesses: businesses.length,
      roles: businesses.reduce(
        (total, business) => total + business.roles.length,
        0,
      ),
      permissions: permissions.length,
      assignmentsAttempted: assignments.length,
      assignmentsCreated: assignmentResult.count,
    };
  });

  console.log('\nRole permission backfill completed.');
  console.log(`Businesses processed: ${result.businesses}`);
  console.log(`System roles processed: ${result.roles}`);
  console.log(`Permissions available: ${result.permissions}`);
  console.log(`Assignments checked: ${result.assignmentsAttempted}`);
  console.log(`New assignments created: ${result.assignmentsCreated}`);
}

main()
  .catch((error) => {
    console.error('Role permission backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
