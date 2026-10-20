import type { SpaceLocation } from '@Domain/spacelocation/space-location.js';

export const LOCATION_CATALOG = Symbol('LOCATION_CATALOG');

/**
 * Universe location catalog — kind is stored with the id, not requested in the path (LOC-010).
 */
export interface LocationCatalog {
  searchLocation4Id(locationId: number): Promise<SpaceLocation | undefined>;
}
