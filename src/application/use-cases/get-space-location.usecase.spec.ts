import { describe, expect, it } from 'vitest';
import { GetSpaceLocationUseCase } from './get-space-location.usecase.js';
import type { LocationCatalog } from '@Domain/ports/location-catalog.port.js';
import { LOCATION_FIXTURE, type SpaceLocation } from '@Domain/spacelocation/space-location.js';
import { NeocomBackendError } from '@Infra/errors/neocom-backend.error.js';

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

const fixtureRegion: SpaceLocation = {
  jsonClass: 'SpaceLocation',
  locationType: 'REGION',
  locationId: LOCATION_FIXTURE.regionId,
  regionId: LOCATION_FIXTURE.regionId,
  regionName: LOCATION_FIXTURE.regionName,
};

describe('GetSpaceLocationUseCase', () => {
  const catalog: LocationCatalog = {
    searchLocation4Id: async (id) => {
      if (id === LOCATION_FIXTURE.stationId) return fixtureStation;
      if (id === LOCATION_FIXTURE.regionId) return fixtureRegion;
      return undefined;
    },
  };
  const useCase = new GetSpaceLocationUseCase(catalog);

  it('returns station kind from catalog for fixture station id', async () => {
    const location = await useCase.execute(LOCATION_FIXTURE.stationId);
    expect(location.jsonClass).toBe('SpaceLocation');
    expect(location.locationType).toBe('STATION');
    expect(location.locationId).toBe(LOCATION_FIXTURE.stationId);
    expect(location.regionId).toBe(LOCATION_FIXTURE.regionId);
    expect(location.solarSystemId).toBe(LOCATION_FIXTURE.solarSystemId);
  });

  it('returns region kind for region id without kind in the path', async () => {
    const location = await useCase.execute(LOCATION_FIXTURE.regionId);
    expect(location.locationType).toBe('REGION');
    expect(location.locationId).toBe(LOCATION_FIXTURE.regionId);
  });

  it('throws NOT_FOUND on catalog miss', async () => {
    await expect(useCase.execute(99999999)).rejects.toBeInstanceOf(NeocomBackendError);
    try {
      await useCase.execute(99999999);
    } catch (err) {
      expect((err as NeocomBackendError).httpStatus).toBe(404);
      expect((err as NeocomBackendError).errors[0]?.code).toBe('LOCATION_NOT_FOUND');
    }
  });
});
