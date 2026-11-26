
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export const DATABASE_CHECK_TIMEOUT_MS = 3000;

export interface HealthStatus {
  status: 'ok' | 'error';
  api: 'up';
  database: 'up' | 'down';
  timestamp: string;
  uptimeSeconds: number;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthStatus> {
    const databaseUp = await this.isDatabaseUp();

    return {
      status: databaseUp ? 'ok' : 'error',
      api: 'up',
      database: databaseUp ? 'up' : 'down',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    };
  }

  private async isDatabaseUp(): Promise<boolean> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(
          new Error(
            `Database check timed out after ${DATABASE_CHECK_TIMEOUT_MS}ms`,
          ),
        ),
        DATABASE_CHECK_TIMEOUT_MS,
      );
    });

    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        timeout,
      ]);

      return true;
    } catch (error) {
      this.logger.error(
        'Database health check failed',
        error instanceof Error ? error.stack : String(error),
      );

      return false;
    } finally {
      clearTimeout(timer);
    }
  }
}
