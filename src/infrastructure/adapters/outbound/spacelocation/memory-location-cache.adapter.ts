import { Injectable } from '@nestjs/common';
import type { LocationCache } from '@Domain/ports/location-cache.port.js';
import type { SpaceLocation } from '@Domain/spacelocation/space-location.js';

/**
 * In-process LocationCache for tests (preload path — not a catalog). LOC-137.
 */
@Injectable()
export class MemoryLocationCache implements LocationCache {
  private readonly byId = new Map<number, SpaceLocation>();

  isActive(): boolean {
    return true;
  }

  async get(locationId: number): Promise<SpaceLocation | undefined> {
    return this.byId.get(locationId);
  }

  async set(locationId: number, location: SpaceLocation): Promise<void> {
    this.byId.set(locationId, location);
  }

  /** Test helper: seed complete SpaceLocation entries. */
  preload(locations: SpaceLocation[]): void {
    for (const location of locations) {
      this.byId.set(location.locationId, location);
    }
  }

  clear(): void {
    this.byId.clear();
  }
}
