/**
 * Space location lookup node (LOC-001 / DOM-LOC-002).
 * Aligns with neocom-domain `SpaceLocation` field contract.
 */
export type LocationIdentifierType =
  | 'REGION'
  | 'CONSTELLATION'
  | 'SOLAR_SYSTEM'
  | 'STATION'
  | 'STRUCTURE';

export interface SpaceLocation {
  locationType: LocationIdentifierType;
  locationId: number;
  regionId?: number;
  regionName?: string;
  constellationId?: number;
  constellationName?: string;
  solarSystemId?: number;
  solarSystemName?: string;
  securityClass?: string;
  securityStatus?: number;
  stationId?: number;
  stationName?: string;
  structureId?: number;
  structureName?: string;
  structureTypeId?: number;
  ownerId?: number;
  corporationId?: number;
  corporationName?: string;
}

/** EPIC-008 Amarr / Domain fixture chain. */
export const LOCATION_FIXTURE = {
  regionId: 1000043,
  regionName: 'Domain',
  constellationId: 20000322,
  constellationName: 'Throne Worlds',
  solarSystemId: 30002187,
  solarSystemName: 'Amarr',
  securityClass: 'E1',
  securityStatus: 0.5623334,
  stationId: 60008494,
  stationName: 'Amarr VIII (Oris) - Emperor Family Academy',
} as const;
