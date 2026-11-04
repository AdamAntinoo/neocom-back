import type { LocationIdentifierType } from '@Domain/spacelocation/space-location.js';
import { Record } from './record.js';

/**
 * Back ↔ front interchange for a catalog space location (BLP-015 / BLP-020).
 * Owned by neocom-back under `infrastructure/adapters/dto` (BLP-026). Extends {@link Record} (BLP-028).
 */
export class SpaceLocationV1Dto extends Record {
  override jsonClass: string = 'SpaceLocationV1Dto';
  locationType: LocationIdentifierType = 'REGION';
  locationId = 0;

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

  constructor(values: Partial<SpaceLocationV1Dto> = {}) {
    super(values);
    Object.assign(this, values);
    this.jsonClass = 'SpaceLocationV1Dto';
  }
}
