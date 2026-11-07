import { describe, expect, it, vi } from 'vitest';
import { EsiLocationResolver } from './esi-location-resolver.js';
import { LOCATION_FIXTURE } from '@Domain/spacelocation/space-location.js';

describe('EsiLocationResolver', () => {
  it('builds public station ancestor chain from ESI (LOC-131)', async () => {
    const publicUniverse = {
      getRegionById: vi.fn().mockResolvedValue({
        region_id: LOCATION_FIXTURE.regionId,
        name: LOCATION_FIXTURE.regionName,
        constellations: [],
      }),
      getConstellationById: vi.fn().mockResolvedValue({
        constellation_id: LOCATION_FIXTURE.constellationId,
        name: LOCATION_FIXTURE.constellationName,
        region_id: LOCATION_FIXTURE.regionId,
        systems: [],
        position: { x: 0, y: 0, z: 0 },
      }),
      getSystemById: vi.fn().mockResolvedValue({
        system_id: LOCATION_FIXTURE.solarSystemId,
        name: LOCATION_FIXTURE.solarSystemName,
        constellation_id: LOCATION_FIXTURE.constellationId,
        security_class: LOCATION_FIXTURE.securityClass,
        security_status: LOCATION_FIXTURE.securityStatus,
        position: { x: 0, y: 0, z: 0 },
      }),
      getStationById: vi.fn().mockResolvedValue({
        station_id: LOCATION_FIXTURE.stationId,
        name: LOCATION_FIXTURE.stationName,
        system_id: LOCATION_FIXTURE.solarSystemId,
        type_id: 1,
        reprocessing_efficiency: 0,
        reprocessing_stations_take: 0,
        max_dockable_ship_volume: 0,
        office_rental_cost: 0,
        services: [],
        position: { x: 0, y: 0, z: 0 },
      }),
    };
    const resolver = new EsiLocationResolver(
      publicUniverse,
      { getCorporationInfo: vi.fn() },
      () => publicUniverse as never,
    );

    const station = await resolver.resolve(LOCATION_FIXTURE.stationId);
    expect(station).toMatchObject({
      jsonClass: 'SpaceLocation',
      locationType: 'STATION',
      locationId: LOCATION_FIXTURE.stationId,
      stationName: LOCATION_FIXTURE.stationName,
      solarSystemId: LOCATION_FIXTURE.solarSystemId,
      solarSystemName: LOCATION_FIXTURE.solarSystemName,
      regionId: LOCATION_FIXTURE.regionId,
      regionName: LOCATION_FIXTURE.regionName,
    });
    expect(station && 'links' in station).toBe(false);
  });

  it('builds structure via authenticated ESI then system chain (LOC-132)', async () => {
    const publicUniverse = {
      getRegionById: vi.fn().mockResolvedValue({
        region_id: LOCATION_FIXTURE.regionId,
        name: LOCATION_FIXTURE.regionName,
        constellations: [],
      }),
      getConstellationById: vi.fn().mockResolvedValue({
        constellation_id: LOCATION_FIXTURE.constellationId,
        name: LOCATION_FIXTURE.constellationName,
        region_id: LOCATION_FIXTURE.regionId,
        systems: [],
        position: { x: 0, y: 0, z: 0 },
      }),
      getSystemById: vi.fn().mockResolvedValue({
        system_id: LOCATION_FIXTURE.solarSystemId,
        name: LOCATION_FIXTURE.solarSystemName,
        constellation_id: LOCATION_FIXTURE.constellationId,
        security_class: LOCATION_FIXTURE.securityClass,
        security_status: LOCATION_FIXTURE.securityStatus,
        position: { x: 0, y: 0, z: 0 },
      }),
      getStationById: vi.fn(),
    };
    const getStructureById = vi.fn().mockResolvedValue({
      name: 'Test Keepstar',
      owner_id: 98_000_001,
      solar_system_id: LOCATION_FIXTURE.solarSystemId,
      type_id: 35834,
    });
    const resolver = new EsiLocationResolver(
      publicUniverse,
      { getCorporationInfo: vi.fn().mockResolvedValue({ name: 'Test Corp' }) },
      () => ({ ...publicUniverse, getStructureById }),
    );

    const structureId = 1_000_000_000_035;
    const structure = await resolver.resolve(structureId, {
      accessToken: 'tok',
      characterName: 'Pilot',
      characterId: 1,
    });
    expect(getStructureById).toHaveBeenCalledWith(structureId);
    expect(structure).toMatchObject({
      locationType: 'STRUCTURE',
      locationId: structureId,
      structureName: 'Test Keepstar',
      corporationName: 'Test Corp',
      solarSystemName: LOCATION_FIXTURE.solarSystemName,
      jsonClass: 'SpaceLocation',
    });
  });
});
