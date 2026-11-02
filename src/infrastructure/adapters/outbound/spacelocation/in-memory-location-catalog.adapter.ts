import { Injectable } from '@nestjs/common';
import type { LocationCatalog } from '@App/ports/location-catalog.port.js';
import {
  LOCATION_FIXTURE,
  type SpaceLocation,
} from '@Domain/spacelocation/space-location.js';

/**
 * Dev/test catalog seeded with the Amarr fixture chain (LOC-020…050).
 * Kind comes from the catalog entry for each id (LOC-010).
 */
@Injectable()
export class InMemoryLocationCatalog implements LocationCatalog {
  private readonly byId = new Map<number, SpaceLocation>();

  constructor() {
    const f = LOCATION_FIXTURE;
    this.put({
      locationType: 'REGION',
      locationId: f.regionId,
      regionId: f.regionId,
      regionName: f.regionName,
    });
    this.put({
      locationType: 'CONSTELLATION',
      locationId: f.constellationId,
      constellationId: f.constellationId,
      constellationName: f.constellationName,
      regionId: f.regionId,
      regionName: f.regionName,
    });
    this.put({
      locationType: 'SOLAR_SYSTEM',
      locationId: f.solarSystemId,
      solarSystemId: f.solarSystemId,
      solarSystemName: f.solarSystemName,
      securityClass: f.securityClass,
      securityStatus: f.securityStatus,
      constellationId: f.constellationId,
      constellationName: f.constellationName,
      regionId: f.regionId,
      regionName: f.regionName,
    });
    this.put({
      locationType: 'STATION',
      locationId: f.stationId,
      stationId: f.stationId,
      stationName: f.stationName,
      solarSystemId: f.solarSystemId,
      solarSystemName: f.solarSystemName,
      securityClass: f.securityClass,
      securityStatus: f.securityStatus,
      constellationId: f.constellationId,
      constellationName: f.constellationName,
      regionId: f.regionId,
      regionName: f.regionName,
    });
  }

  private put(location: SpaceLocation): void {
    this.byId.set(location.locationId, location);
  }

  async searchLocation4Id(locationId: number): Promise<SpaceLocation | undefined> {
    return this.byId.get(locationId);
  }
}
