import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SpaceLocation } from '@Domain/spacelocation/space-location.js';
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

import { RedisLocationCache } from './redis-location-cache.adapter.js';

const station: SpaceLocation = {
  jsonClass: 'SpaceLocation',
  locationType: 'STATION',
  locationId: 60003760,
  stationId: 60003760,
  stationName: 'Jita IV - Moon 4',
  solarSystemId: 30000142,
  solarSystemName: 'Jita',
  securityClass: 'HIGH_SEC',
  securityStatus: 0.9,
  constellationId: 20000020,
  constellationName: 'Kimotoro',
  regionId: 10000002,
  regionName: 'The Forge',
};

describe('RedisLocationCache', () => {
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
    const cache = new RedisLocationCache(redisConfig(undefined));
    expect(cache.isActive()).toBe(false);
    expect(RedisCtor).not.toHaveBeenCalled();
  });

  it('connects and caches get/set round-trip', async () => {
    redis.get.mockResolvedValue(JSON.stringify(station));
    redis.set.mockResolvedValue('OK');
    const cache = new RedisLocationCache(redisConfig());
    await waitUntilActive(cache);

    expect(await cache.get(60003760)).toEqual(station);
    expect(redis.get).toHaveBeenCalledWith('neocom:location:60003760');

    await cache.set(60003760, station);
    expect(redis.set).toHaveBeenCalledWith(
      'neocom:location:60003760',
      JSON.stringify(station),
    );
  });

  it('returns undefined on cache miss and Redis get errors', async () => {
    redis.get
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('boom'));
    const cache = new RedisLocationCache(redisConfig());
    await waitUntilActive(cache);

    expect(await cache.get(1)).toBeUndefined();
    expect(await cache.get(2)).toBeUndefined();
  });

  it('swallows set errors and quits on destroy', async () => {
    redis.set.mockRejectedValue(new Error('write fail'));
    redis.quit.mockResolvedValue('OK');
    const cache = new RedisLocationCache(redisConfig());
    await waitUntilActive(cache);

    await cache.set(1, station);
    await cache.onModuleDestroy();
    expect(redis.quit).toHaveBeenCalled();
    expect(cache.isActive()).toBe(false);
  });

  it('disconnects when quit fails during destroy', async () => {
    redis.quit.mockRejectedValue(new Error('quit fail'));
    const cache = new RedisLocationCache(redisConfig());
    await waitUntilActive(cache);
    await cache.onModuleDestroy();
    expect(redis.disconnect).toHaveBeenCalled();
  });
});
