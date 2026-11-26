
import {
  ServiceUnavailableException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

describe('HealthController', () => {
  it('returns health status when everything is working', async () => {
    const healthService = {
      check: vi.fn().mockResolvedValue({
        status: 'ok',
        api: 'up',
        database: 'up',
        timestamp: new Date().toISOString(),
        uptimeSeconds: 10,
      }),
    };

    const controller = new HealthController(
      healthService as unknown as HealthService,
    );

    const result = await controller.getHealth();

    expect(result.status).toBe('ok');
  });

  it('throws 503 when database is unavailable', async () => {
    const healthService = {
      check: vi.fn().mockResolvedValue({
        status: 'error',
        api: 'up',
        database: 'down',
        timestamp: new Date().toISOString(),
        uptimeSeconds: 10,
      }),
    };

    const controller = new HealthController(
      healthService as unknown as HealthService,
    );

    await expect(controller.getHealth()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
