import type { SpaceLocation } from '@Domain/spacelocation/space-location.js';

export const LOCATION_CACHE = Symbol('LOCATION_CACHE');

/**
 * Injectable location storage behind the catalog (LOC-134 / LOC-140).
 * Implementations may be Redis-backed or an in-process store used by tests to preload.
 */
export interface LocationCache {
  /** Whether the cache is currently usable for reads/writes. */
  isActive(): boolean;
  get(locationId: number): Promise<SpaceLocation | undefined>;
  set(locationId: number, location: SpaceLocation): Promise<void>;
}
