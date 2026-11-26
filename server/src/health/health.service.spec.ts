
import { Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  DATABASE_CHECK_TIMEOUT_MS,
  HealthService,
} from './health.service.js';

describe('HealthService', () => {
  let service: HealthService;
  let prisma: { $queryRaw: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    prisma = {
      $queryRaw: vi.fn(),
    };

    service = new HealthService(
      prisma as unknown as PrismaService,
    );
  });

  it('returns healthy status when database is available', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const result = await service.check();

    expect(result.status).toBe('ok');
    expect(result.api).toBe('up');
    expect(result.database).toBe('up');
  });

  it('returns error status when database query fails', async () => {
    const loggerSpy = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    prisma.$queryRaw.mockRejectedValue(
      new Error('Database connection failed'),
    );

    const result = await service.check();

    expect(result.status).toBe('error');
    expect(result.database).toBe('down');

    loggerSpy.mockRestore();
  });

  it('returns error status when database query times out', async () => {
    vi.useFakeTimers();

    prisma.$queryRaw.mockReturnValue(new Promise(() => {}));

    const resultPromise = service.check();

    await vi.advanceTimersByTimeAsync(
      DATABASE_CHECK_TIMEOUT_MS,
    );

    const result = await resultPromise;

    expect(result.status).toBe('error');
    expect(result.database).toBe('down');

    vi.useRealTimers();
  });
});
