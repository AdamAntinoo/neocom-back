import type { LocationAuth } from '@Domain/spacelocation/location-auth.js';
import type { SpaceLocation } from '@Domain/spacelocation/space-location.js';

export const LOCATION_CATALOG = Symbol('LOCATION_CATALOG');

/**
 * Universe location catalog — kind is stored with the id, not requested in the path (LOC-010).
 * Signals absence with `undefined` (LOC-133); may throw for auth failures on structure ranges (LOC-135).
 */
export interface LocationCatalog {
  searchLocation4Id(
    locationId: number,
    auth?: LocationAuth | null,
  ): Promise<SpaceLocation | undefined>;
}
