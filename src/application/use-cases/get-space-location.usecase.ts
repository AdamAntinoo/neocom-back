import { Inject, Injectable } from '@nestjs/common';
import {
  LOCATION_CATALOG,
  type LocationCatalog,
} from '@Domain/ports/location-catalog.port.js';
import type { LocationAuth } from '@Domain/spacelocation/location-auth.js';
import type { SpaceLocation } from '@Domain/spacelocation/space-location.js';
import {
  ExceptionCatalog,
  exceptionPayload,
} from '@Infra/adapters/exceptions/index.js';

@Injectable()
export class GetSpaceLocationUseCase {
  constructor(
    @Inject(LOCATION_CATALOG) private readonly catalog: LocationCatalog,
  ) {}

  async execute(
    locationId: number,
    auth?: LocationAuth | null,
  ): Promise<SpaceLocation> {
    const location = await this.catalog.searchLocation4Id(locationId, auth);
    if (!location) {
      throw ExceptionCatalog.LOCATION_NOT_FOUND.doThrow(
        locationId,
        exceptionPayload()
          .field('locationId')
          .container('path')
          .value(String(locationId))
          .build(),
      );
    }
    return location;
  }
}
