import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EveLocationV1Dto } from '@Infra/adapters/inbound/dto/eve-location-v1.dto.js';
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

import {
  MARKET_PRICE_CACHE_TTL_SECONDS,
  RedisMarketPriceCache,
} from './redis-market-price-cache.adapter.js';

describe('RedisMarketPriceCache', () => {
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
    const cache = new RedisMarketPriceCache(redisConfig(undefined));
    expect(cache.isActive()).toBe(false);
  });

  it('get/set orders with TTL', async () => {
    const orders = [{ price: 1, volumeRemain: 10 }];
    redis.get.mockResolvedValue(JSON.stringify(orders));
    redis.set.mockResolvedValue('OK');
    const cache = new RedisMarketPriceCache(redisConfig());
    await waitUntilActive(cache);

    expect(await cache.getOrders(34)).toEqual(orders);
    expect(redis.get).toHaveBeenCalledWith('neocom:market:orders:forge:34');

    await cache.setOrders(34, orders as never);
    expect(redis.set).toHaveBeenCalledWith(
      'neocom:market:orders:forge:34',
      JSON.stringify(orders),
      'EX',
      MARKET_PRICE_CACHE_TTL_SECONDS,
    );
  });

  it('rejects non-array order payloads', async () => {
    redis.get.mockResolvedValue(JSON.stringify({ not: 'array' }));
    const cache = new RedisMarketPriceCache(redisConfig());
    await waitUntilActive(cache);
    expect(await cache.getOrders(34)).toBeUndefined();
  });

  it('get/set hub quotes and revives EveLocationV1Dto', async () => {
    redis.get.mockResolvedValue(
      JSON.stringify({
        buyPrice: 10,
        sellPrice: 12,
        marketHub: { locationId: 60003760, locationType: 'STATION' },
      }),
    );
    redis.set.mockResolvedValue('OK');
    const cache = new RedisMarketPriceCache(redisConfig());
    await waitUntilActive(cache);

    const quote = await cache.getQuote(34);
    expect(quote?.buyPrice).toBe(10);
    expect(quote?.sellPrice).toBe(12);
    expect(quote?.marketHub).toBeInstanceOf(EveLocationV1Dto);
    expect(quote?.marketHub.locationId).toBe(60003760);

    await cache.setQuote(34, {
      buyPrice: 10,
      sellPrice: 12,
      marketHub: new EveLocationV1Dto({ locationId: 60003760 }),
    });
    expect(redis.set).toHaveBeenCalledWith(
      'neocom:market:hub-price:60003760:34',
      expect.any(String),
      'EX',
      MARKET_PRICE_CACHE_TTL_SECONDS,
    );
  });

  it('returns undefined when inactive or Redis errors', async () => {
    const inactive = new RedisMarketPriceCache(redisConfig(undefined));
    expect(await inactive.getOrders(1)).toBeUndefined();
    expect(await inactive.getQuote(1)).toBeUndefined();
    await inactive.setOrders(1, [] as never);
    await inactive.setQuote(1, {
      buyPrice: 1,
      sellPrice: 2,
      marketHub: new EveLocationV1Dto({}),
    });

    redis.get.mockRejectedValue(new Error('down'));
    redis.set.mockRejectedValue(new Error('down'));
    const cache = new RedisMarketPriceCache(redisConfig());
    await waitUntilActive(cache);
    expect(await cache.getOrders(1)).toBeUndefined();
    expect(await cache.getQuote(1)).toBeUndefined();
    await cache.setOrders(1, [] as never);
    await cache.setQuote(1, {
      buyPrice: 1,
      sellPrice: 2,
      marketHub: new EveLocationV1Dto({}),
    });
  });

  it('quits on destroy', async () => {
    redis.quit.mockResolvedValue('OK');
    const cache = new RedisMarketPriceCache(redisConfig());
    await waitUntilActive(cache);
    await cache.onModuleDestroy();
    expect(redis.quit).toHaveBeenCalled();
    expect(cache.isActive()).toBe(false);
  });
});
