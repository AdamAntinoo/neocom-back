import { vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';

/** Shared ioredis mock for Redis cache adapter specs. */
export function createRedisMock() {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
    set: vi.fn(),
    quit: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
  };
}

export type RedisMockClient = ReturnType<typeof createRedisMock>;

/** Pass no args for a default URL; pass `undefined` explicitly to leave REDIS_URL unset. */
export function redisConfig(
  ...args: [] | [string | undefined]
): ConfigService {
  const url = args.length === 0 ? 'redis://localhost:6004' : args[0];
  return {
    get: (key: string) => (key === 'REDIS_URL' ? url : undefined),
  } as ConfigService;
}

export async function waitUntilActive(cache: {
  isActive: () => boolean;
}): Promise<void> {
  await vi.waitFor(() => {
    expect(cache.isActive()).toBe(true);
  });
}
