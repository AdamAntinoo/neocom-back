import { describe, expect, it, vi } from 'vitest';
import type { LocationCache } from '@Domain/ports/location-cache.port.js';
import {
  LOCATION_FIXTURE,
  type SpaceLocation,
} from '@Domain/spacelocation/space-location.js';
import { NeocomBackendError } from 'neocom-domain';
import { EsiLocationResolver } from './esi-location-resolver.js';
import { EsiRedisLocationCatalog } from './esi-redis-location-catalog.adapter.js';

const fixtureStation: SpaceLocation = {
  jsonClass: 'SpaceLocation',
  locationType: 'STATION',
  locationId: LOCATION_FIXTURE.stationId,
  stationId: LOCATION_FIXTURE.stationId,
  stationName: LOCATION_FIXTURE.stationName,
  solarSystemId: LOCATION_FIXTURE.solarSystemId,
  solarSystemName: LOCATION_FIXTURE.solarSystemName,
  securityClass: LOCATION_FIXTURE.securityClass,
  securityStatus: LOCATION_FIXTURE.securityStatus,
  constellationId: LOCATION_FIXTURE.constellationId,
  constellationName: LOCATION_FIXTURE.constellationName,
  regionId: LOCATION_FIXTURE.regionId,
  regionName: LOCATION_FIXTURE.regionName,
};

/** Spec-only stub — production location cache is Redis (`RedisLocationCache`). */
function stubLocationCache(
  seed: SpaceLocation[] = [],
): LocationCache & { store: Map<number, SpaceLocation> } {
  const store = new Map<number, SpaceLocation>(
    seed.map((l) => [l.locationId, l]),
  );
  return {
    store,
    isActive: () => true,
    get: async (id) => store.get(id),
    set: async (id, location) => {
      store.set(id, location);
    },
  };
}

describe('EsiRedisLocationCatalog', () => {
  it('returns cache hits without calling ESI (LOC-137)', async () => {
    const cache = stubLocationCache([fixtureStation]);
    const resolve = vi.fn();
    const resolver = {
      resolve,
      hierarchyDependencies: () => [],
    } as unknown as EsiLocationResolver;
    const catalog = new EsiRedisLocationCatalog(cache).useResolver(resolver);

    const hit = await catalog.searchLocation4Id(LOCATION_FIXTURE.stationId);
    expect(hit?.stationName).toBe(LOCATION_FIXTURE.stationName);
    expect(resolve).not.toHaveBeenCalled();
  });

  it('builds from ESI and write-through hierarchy when cache misses (LOC-140/141)', async () => {
    const cache = stubLocationCache();
    const resolver = {
      resolve: vi.fn().mockResolvedValue(fixtureStation),
      hierarchyDependencies: (location: SpaceLocation) =>
        new EsiLocationResolver(
          {} as never,
          {} as never,
          () => ({}) as never,
        ).hierarchyDependencies(location),
    } as unknown as EsiLocationResolver;
    const catalog = new EsiRedisLocationCatalog(cache).useResolver(resolver);

    const built = await catalog.searchLocation4Id(LOCATION_FIXTURE.stationId);
    expect(built?.locationType).toBe('STATION');
    expect(await cache.get(LOCATION_FIXTURE.stationId)).toEqual(fixtureStation);
    expect(await cache.get(LOCATION_FIXTURE.solarSystemId)).toMatchObject({
      locationType: 'SOLAR_SYSTEM',
      solarSystemName: LOCATION_FIXTURE.solarSystemName,
    });
    expect(await cache.get(LOCATION_FIXTURE.regionId)).toMatchObject({
      locationType: 'REGION',
      regionName: LOCATION_FIXTURE.regionName,
    });
  });

  it('still resolves via ESI when cache is inactive (LOC-134)', async () => {
    const inactive = {
      isActive: () => false,
      get: vi.fn(),
      set: vi.fn(),
    };
    const resolver = {
      resolve: vi.fn().mockResolvedValue(fixtureStation),
      hierarchyDependencies: () => [],
    } as unknown as EsiLocationResolver;
    const catalog = new EsiRedisLocationCatalog(inactive).useResolver(resolver);

    const built = await catalog.searchLocation4Id(LOCATION_FIXTURE.stationId);
    expect(built?.locationId).toBe(LOCATION_FIXTURE.stationId);
    expect(inactive.get).not.toHaveBeenCalled();
    expect(inactive.set).not.toHaveBeenCalled();
  });

  it('throws 401 when structure resolve lacks access cookie (LOC-135)', async () => {
    const catalog = new EsiRedisLocationCatalog(
      stubLocationCache(),
    ).useResolver(EsiLocationResolver.createDefault());
    await expect(
      catalog.searchLocation4Id(1_000_000_000_035),
    ).rejects.toBeInstanceOf(NeocomBackendError);
    try {
      await catalog.searchLocation4Id(1_000_000_000_035);
    } catch (err) {
      expect((err as NeocomBackendError).errors[0]?.code).toBe('UNAUTHORIZED');
    }
  });
});
