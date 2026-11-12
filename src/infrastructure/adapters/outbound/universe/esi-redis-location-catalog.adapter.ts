import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  LOCATION_CACHE,
  type LocationCache,
} from '@Domain/ports/location-cache.port.js';
import type { LocationCatalog } from '@Domain/ports/location-catalog.port.js';
import type { LocationAuth } from '@Domain/spacelocation/location-auth.js';
import type { SpaceLocation } from '@Domain/spacelocation/space-location.js';
import { EsiLocationResolver } from './esi-location-resolver.js';

/**
 * ESI resolve + Redis write-through catalog (LOC-130…141). No in-memory catalog.
 */
@Injectable()
export class EsiRedisLocationCatalog implements LocationCatalog {
  private resolver: EsiLocationResolver;

  constructor(
    @Optional()
    @Inject(LOCATION_CACHE)
    private readonly cache: LocationCache | null,
  ) {
    this.resolver = EsiLocationResolver.createDefault();
  }

  /** Test seam — swap the ESI resolver without Nest DI. */
  useResolver(resolver: EsiLocationResolver): this {
    this.resolver = resolver;
    return this;
  }

  async searchLocation4Id(
    locationId: number,
    auth?: LocationAuth | null,
  ): Promise<SpaceLocation | undefined> {
    if (this.cache?.isActive()) {
      const hit = await this.cache.get(locationId);
      if (hit) {
        return hit;
      }
    }

    const built = await this.resolver.resolve(locationId, auth);
    if (!built) {
      return undefined;
    }

    await this.writeThrough(built);
    return built;
  }

  /** Test / ops: seed the cache adapter (LOC-137 preload). */
  async preload(locations: SpaceLocation[]): Promise<void> {
    if (!this.cache) {
      return;
    }
    for (const location of locations) {
      await this.cache.set(location.locationId, location);
    }
  }

  private async writeThrough(location: SpaceLocation): Promise<void> {
    if (!this.cache?.isActive()) {
      return;
    }
    await this.cache.set(location.locationId, location);
    for (const dep of this.resolver.hierarchyDependencies(location)) {
      await this.cache.set(dep.locationId, dep);
    }
  }
}
