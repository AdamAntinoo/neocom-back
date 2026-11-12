import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EveItemV1Dto } from '@Infra/adapters/inbound/dto/eve-item-v1.dto.js';
import {
  createRedisMock,
  redisConfig,
  waitUntilActive,
  type RedisMockClient,
} from './redis-cache.test-util.js';

const { mockRedis, RedisCtor } = vi.hoisted(() => {
  const mockRedis = {
    connect: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
    set: vi.fn(),
    quit: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
  };
  return {
    mockRedis,
    RedisCtor: vi.fn(function Redis() {
      return mockRedis;
    }),
  };
});

vi.mock('ioredis', () => ({ Redis: RedisCtor }));

import { RedisUniverseTypeCache } from './redis-universe-type-cache.adapter.js';

describe('RedisUniverseTypeCache', () => {
  let redis: RedisMockClient;

  beforeEach(() => {
    vi.clearAllMocks();
    redis = mockRedis as unknown as RedisMockClient;
    Object.assign(redis, createRedisMock());
    RedisCtor.mockImplementation(function Redis() {
      return redis;
    });
  });

  it('stays inactive when REDIS_URL is unset', () => {
    const cache = new RedisUniverseTypeCache(redisConfig(undefined));
    expect(cache.isActive()).toBe(false);
  });

  it('get/set EveItemV1Dto without TTL', async () => {
    const item = new EveItemV1Dto({ typeId: 34, name: 'Tritanium' });
    redis.get.mockResolvedValue(JSON.stringify(item));
    redis.set.mockResolvedValue('OK');
    const cache = new RedisUniverseTypeCache(redisConfig());
    await waitUntilActive(cache);

    const hit = await cache.get(34);
    expect(hit).toBeInstanceOf(EveItemV1Dto);
    expect(hit?.typeId).toBe(34);
    expect(hit?.name).toBe('Tritanium');
    expect(redis.get).toHaveBeenCalledWith('neocom:universe-type:34');

    await cache.set(34, item);
    expect(redis.set).toHaveBeenCalledWith(
      'neocom:universe-type:34',
      JSON.stringify(item),
    );
    expect(redis.set.mock.calls[0]).toHaveLength(2);
  });

  it('returns undefined on miss and Redis errors', async () => {
    redis.get.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('x'));
    const cache = new RedisUniverseTypeCache(redisConfig());
    await waitUntilActive(cache);
    expect(await cache.get(1)).toBeUndefined();
    expect(await cache.get(2)).toBeUndefined();

    redis.set.mockRejectedValue(new Error('x'));
    await cache.set(3, new EveItemV1Dto({ typeId: 3 }));
  });

  it('quits on destroy', async () => {
    redis.quit.mockResolvedValue('OK');
    const cache = new RedisUniverseTypeCache(redisConfig());
    await waitUntilActive(cache);
    await cache.onModuleDestroy();
    expect(redis.quit).toHaveBeenCalled();
  });
});
