import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  LOCATION_CATALOG,
  type LocationCatalog,
} from '@App/ports/location-catalog.port.js';
import type { SpaceLocation } from '@Domain/spacelocation/space-location.js';
import { NeocomBackendError } from '@Infra/errors/neocom-backend.error.js';

@Injectable()
export class GetSpaceLocationUseCase {
  constructor(@Inject(LOCATION_CATALOG) private readonly catalog: LocationCatalog) {}

  async execute(locationId: number): Promise<SpaceLocation> {
    const location = await this.catalog.searchLocation4Id(locationId);
    if (!location) {
      throw new NeocomBackendError(HttpStatus.NOT_FOUND, [
        {
          code: 'LOCATION_NOT_FOUND',
          description: `No SpaceLocation catalog entry for id ${locationId}.`,
          field: 'locationId',
          container: 'path',
          value: String(locationId),
        },
      ]);
    }
    return location;
  }
}
