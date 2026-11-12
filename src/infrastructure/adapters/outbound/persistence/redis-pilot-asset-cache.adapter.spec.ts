import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PILOT_ASSET_CACHE_TTL_SECONDS } from '@Domain/ports/pilot-asset-cache.port.js';
import { EveAssetV1Dto } from '@Infra/adapters/inbound/dto/eve-asset-v1.dto.js';
import { EveLocationV1Dto } from '@Infra/adapters/inbound/dto/eve-location-v1.dto.js';
import { LocatedAssetContainerV1Dto } from '@Infra/adapters/inbound/dto/located-asset-container-v1.dto.js';
import { PricedItemV1Dto } from '@Infra/adapters/inbound/dto/priced-item-v1.dto.js';
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

import { RedisPilotAssetCache } from './redis-pilot-asset-cache.adapter.js';

describe('RedisPilotAssetCache', () => {
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
    const cache = new RedisPilotAssetCache(redisConfig(undefined));
    expect(cache.isActive()).toBe(false);
  });

  it('revives EveAssetV1Dto and LocatedAssetContainerV1Dto trees from cache', async () => {
    const payload = [
      {
        jsonClass: 'EveAssetV1Dto',
        itemId: 1,
        typeId: 34,
        quantity: 5,
        item: {
          typeId: 34,
          name: 'Tritanium',
          marketHub: { locationId: 60003760, locationType: 'STATION' },
        },
        location: { locationId: 60003760, locationType: 'STATION' },
      },
      {
        jsonClass: 'LocatedAssetContainerV1Dto',
        itemId: 2,
        typeId: 17366,
        contents: [
          {
            jsonClass: 'EveAssetV1Dto',
            itemId: 3,
            typeId: 34,
            item: { typeId: 34, marketHub: { locationId: 60003760 } },
          },
        ],
        item: { typeId: 17366, marketHub: { locationId: 60003760 } },
      },
    ];
    redis.get.mockResolvedValue(JSON.stringify(payload));
    redis.set.mockResolvedValue('OK');
    const cache = new RedisPilotAssetCache(redisConfig());
    await waitUntilActive(cache);

    const nodes = await cache.get(93813310);
    expect(nodes).toHaveLength(2);
    expect(nodes?.[0]).toBeInstanceOf(EveAssetV1Dto);
    expect(nodes?.[0].item).toBeInstanceOf(PricedItemV1Dto);
    expect(nodes?.[0].location).toBeInstanceOf(EveLocationV1Dto);
    expect(nodes?.[1]).toBeInstanceOf(LocatedAssetContainerV1Dto);
    expect((nodes?.[1] as LocatedAssetContainerV1Dto).contents[0]).toBeInstanceOf(
      EveAssetV1Dto,
    );

    await cache.set(93813310, nodes!);
    expect(redis.set).toHaveBeenCalledWith(
      'neocom:pilot/asset:93813310',
      expect.any(String),
      'EX',
      PILOT_ASSET_CACHE_TTL_SECONDS,
    );
  });

  it('returns undefined for miss, non-array payload, and Redis errors', async () => {
    redis.get
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JSON.stringify({ not: 'array' }))
      .mockRejectedValueOnce(new Error('down'));
    const cache = new RedisPilotAssetCache(redisConfig());
    await waitUntilActive(cache);
    expect(await cache.get(1)).toBeUndefined();
    expect(await cache.get(1)).toBeUndefined();
    expect(await cache.get(1)).toBeUndefined();

    redis.set.mockRejectedValue(new Error('down'));
    await cache.set(1, []);
  });

  it('no-ops get/set when inactive and quits on destroy', async () => {
    const inactive = new RedisPilotAssetCache(redisConfig(undefined));
    expect(await inactive.get(1)).toBeUndefined();
    await inactive.set(1, []);

    redis.quit.mockResolvedValue('OK');
    const cache = new RedisPilotAssetCache(redisConfig());
    await waitUntilActive(cache);
    await cache.onModuleDestroy();
    expect(redis.quit).toHaveBeenCalled();
    expect(cache.isActive()).toBe(false);
  });
});
