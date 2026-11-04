import {
  EsiClient,
  isForbidden,
  isNotFound,
  isUnauthorized,
  type ConstellationInfo,
  type RegionInfo,
  type SolarSystemInfo,
  type StationInfo,
  type StructureInfo,
} from '@lgriffin/esi.ts';
import type { LocationAuth } from '@Domain/spacelocation/location-auth.js';
import { classifyLocationId } from '@Domain/spacelocation/location-id-range.js';
import type { SpaceLocation } from '@Domain/spacelocation/space-location.js';
import {
  ExceptionCatalog,
  exceptionPayload,
} from '@Infra/adapters/exceptions/index.js';

const ESI_USER_AGENT =
  'neocom-back/0.1.0 (AdamAntinoo; https://github.com/AdamAntinoo/neocom-back)';

export type PublicUniverseApi = {
  getRegionById(regionId: number): Promise<RegionInfo>;
  getConstellationById(constellationId: number): Promise<ConstellationInfo>;
  getSystemById(systemId: number): Promise<SolarSystemInfo>;
  getStationById(stationId: number): Promise<StationInfo>;
};

export type AuthenticatedUniverseApi = PublicUniverseApi & {
  getStructureById(structureId: number): Promise<StructureInfo>;
};

export type CorporationNameApi = {
  getCorporationInfo(corporationId: number): Promise<{ name: string }>;
};

/**
 * Builds complete SpaceLocation trees from ESI by LocationFactory id range (LOC-131 / LOC-132).
 */
export class EsiLocationResolver {
  constructor(
    private readonly publicUniverse: PublicUniverseApi,
    private readonly corporationApi: CorporationNameApi,
    private readonly createAuthedUniverse: (auth: LocationAuth) => AuthenticatedUniverseApi,
  ) {}

  static createDefault(): EsiLocationResolver {
    const publicClient = new EsiClient({
      clientId: 'neocom-back-locations',
      userAgent: ESI_USER_AGENT,
    });
    return new EsiLocationResolver(
      publicClient.universe,
      {
        getCorporationInfo: (id) => publicClient.corporations.getCorporationInfo(id),
      },
      (auth) => {
        const authed = new EsiClient({
          clientId: 'neocom-back-locations',
          userAgent: ESI_USER_AGENT,
          accessToken: auth.accessToken,
        });
        return authed.universe;
      },
    );
  }

  async resolve(
    locationId: number,
    auth?: LocationAuth | null,
  ): Promise<SpaceLocation | undefined> {
    const kind = classifyLocationId(locationId);
    try {
      switch (kind) {
        case 'REGION':
          return await this.buildRegion(locationId);
        case 'CONSTELLATION':
          return await this.buildConstellation(locationId);
        case 'SOLAR_SYSTEM':
          return await this.buildSolarSystem(locationId);
        case 'STATION':
          return await this.buildStation(locationId);
        case 'STRUCTURE':
          return await this.buildStructure(locationId, auth);
        default:
          return undefined;
      }
    } catch (error) {
      if (isNotFound(error)) {
        return undefined;
      }
      throw error;
    }
  }

  /** Ancestor SpaceLocation nodes that should also be cached (LOC-141). */
  hierarchyDependencies(location: SpaceLocation): SpaceLocation[] {
    const deps: SpaceLocation[] = [];
    if (
      location.locationType !== 'REGION' &&
      location.regionId !== undefined &&
      location.regionName !== undefined
    ) {
      deps.push({
        jsonClass: 'SpaceLocation',
        locationType: 'REGION',
        locationId: location.regionId,
        regionId: location.regionId,
        regionName: location.regionName,
      });
    }
    if (
      (location.locationType === 'SOLAR_SYSTEM' ||
        location.locationType === 'STATION' ||
        location.locationType === 'STRUCTURE') &&
      location.constellationId !== undefined &&
      location.constellationName !== undefined &&
      location.regionId !== undefined &&
      location.regionName !== undefined
    ) {
      deps.push({
        jsonClass: 'SpaceLocation',
        locationType: 'CONSTELLATION',
        locationId: location.constellationId,
        constellationId: location.constellationId,
        constellationName: location.constellationName,
        regionId: location.regionId,
        regionName: location.regionName,
      });
    }
    if (
      (location.locationType === 'STATION' || location.locationType === 'STRUCTURE') &&
      location.solarSystemId !== undefined &&
      location.solarSystemName !== undefined &&
      location.constellationId !== undefined &&
      location.constellationName !== undefined &&
      location.regionId !== undefined &&
      location.regionName !== undefined
    ) {
      deps.push({
        jsonClass: 'SpaceLocation',
        locationType: 'SOLAR_SYSTEM',
        locationId: location.solarSystemId,
        solarSystemId: location.solarSystemId,
        solarSystemName: location.solarSystemName,
        securityClass: location.securityClass,
        securityStatus: location.securityStatus,
        constellationId: location.constellationId,
        constellationName: location.constellationName,
        regionId: location.regionId,
        regionName: location.regionName,
      });
    }
    return deps;
  }

  private async buildRegion(regionId: number): Promise<SpaceLocation> {
    const region = await this.publicUniverse.getRegionById(regionId);
    return {
      jsonClass: 'SpaceLocation',
      locationType: 'REGION',
      locationId: region.region_id,
      regionId: region.region_id,
      regionName: region.name,
    };
  }

  private async buildConstellation(constellationId: number): Promise<SpaceLocation> {
    const constellation = await this.publicUniverse.getConstellationById(constellationId);
    const region = await this.publicUniverse.getRegionById(constellation.region_id);
    return {
      jsonClass: 'SpaceLocation',
      locationType: 'CONSTELLATION',
      locationId: constellation.constellation_id,
      constellationId: constellation.constellation_id,
      constellationName: constellation.name,
      regionId: region.region_id,
      regionName: region.name,
    };
  }

  private async buildSolarSystem(systemId: number): Promise<SpaceLocation> {
    const system = await this.publicUniverse.getSystemById(systemId);
    const constellation = await this.publicUniverse.getConstellationById(system.constellation_id);
    const region = await this.publicUniverse.getRegionById(constellation.region_id);
    return {
      jsonClass: 'SpaceLocation',
      locationType: 'SOLAR_SYSTEM',
      locationId: system.system_id,
      solarSystemId: system.system_id,
      solarSystemName: system.name,
      securityClass: system.security_class,
      securityStatus: system.security_status,
      constellationId: constellation.constellation_id,
      constellationName: constellation.name,
      regionId: region.region_id,
      regionName: region.name,
    };
  }

  private async buildStation(stationId: number): Promise<SpaceLocation> {
    const station = await this.publicUniverse.getStationById(stationId);
    const systemChain = await this.buildSolarSystem(station.system_id);
    return {
      ...systemChain,
      jsonClass: 'SpaceLocation',
      locationType: 'STATION',
      locationId: station.station_id,
      stationId: station.station_id,
      stationName: station.name,
    };
  }

  private async buildStructure(
    structureId: number,
    auth?: LocationAuth | null,
  ): Promise<SpaceLocation> {
    if (!auth?.accessToken) {
      throw ExceptionCatalog.LOCATION_AUTH_REQUIRED.doThrow(
        structureId,
        exceptionPayload()
          .field('locationId')
          .container('path')
          .value(String(structureId))
          .build(),
      );
    }
    const universe = this.createAuthedUniverse(auth);
    let structure: StructureInfo;
    try {
      structure = await universe.getStructureById(structureId);
    } catch (error) {
      if (isUnauthorized(error)) {
        throw ExceptionCatalog.LOCATION_AUTH_REQUIRED.doThrow(
          structureId,
          exceptionPayload()
            .field('locationId')
            .container('path')
            .value(String(structureId))
            .build(),
        );
      }
      if (isForbidden(error)) {
        throw ExceptionCatalog.LOCATION_FORBIDDEN.doThrow(
          structureId,
          exceptionPayload()
            .field('locationId')
            .container('path')
            .value(String(structureId))
            .build(),
        );
      }
      throw error;
    }
    const systemChain = await this.buildSolarSystem(structure.solar_system_id);
    const corporationId = structure.owner_id;
    let corporationName: string | undefined;
    try {
      const corp = await this.corporationApi.getCorporationInfo(corporationId);
      corporationName = corp.name;
    } catch {
      corporationName = undefined;
    }
    return {
      ...systemChain,
      jsonClass: 'SpaceLocation',
      locationType: 'STRUCTURE',
      locationId: structureId,
      structureId,
      structureName: structure.name,
      structureTypeId: structure.type_id,
      ownerId: structure.owner_id,
      corporationId,
      corporationName,
    };
  }
}
