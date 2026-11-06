/**
 * LocationFactory id ranges (LOC-131): region &lt; 20M, constellation &lt; 30M,
 * system &lt; 40M, station &lt; 61M; otherwise structure.
 */
export type LocationIdKind =
  | 'REGION'
  | 'CONSTELLATION'
  | 'SOLAR_SYSTEM'
  | 'STATION'
  | 'STRUCTURE';

export const LOCATION_ID_REGION_MAX = 20_000_000;
export const LOCATION_ID_CONSTELLATION_MAX = 30_000_000;
export const LOCATION_ID_SYSTEM_MAX = 40_000_000;
export const LOCATION_ID_STATION_MAX = 61_000_000;

export function classifyLocationId(locationId: number): LocationIdKind {
  if (locationId < LOCATION_ID_REGION_MAX) {
    return 'REGION';
  }
  if (locationId < LOCATION_ID_CONSTELLATION_MAX) {
    return 'CONSTELLATION';
  }
  if (locationId < LOCATION_ID_SYSTEM_MAX) {
    return 'SOLAR_SYSTEM';
  }
  if (locationId < LOCATION_ID_STATION_MAX) {
    return 'STATION';
  }
  return 'STRUCTURE';
}

export function requiresAuthenticatedEsi(locationId: number): boolean {
  return classifyLocationId(locationId) === 'STRUCTURE';
}
