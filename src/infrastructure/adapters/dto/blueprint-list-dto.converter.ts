import type { EsiClient } from '@lgriffin/esi.ts';
import type { SpaceLocation } from '@Domain/spacelocation/space-location.js';
import { BlueprintV1Dto } from './blueprint-v1.dto.js';
import { SpaceLocationV1Dto } from './space-location-v1.dto.js';

/** One element of {@link EsiClient.characters.getCharacterBlueprints}. */
export type EsiCharacterBlueprint = Awaited<
  ReturnType<EsiClient['characters']['getCharacterBlueprints']>
>[number];

/**
 * Static origin→DTO conversions for blueprint-list processing (BLP-027 / BLP-029).
 * Do not instantiate — use static methods only.
 */
export class BlueprintListDtoConverter {
  private constructor() {}

  /** ESI library character blueprint → {@link BlueprintV1Dto}. */
  static toBlueprintV1Dto(row: EsiCharacterBlueprint): BlueprintV1Dto {
    return new BlueprintV1Dto({
      blueprintId: row.item_id,
      blueprintTypeId: row.type_id,
      blueprintTypeName: '',
      outputTypeId: 0,
      outputTypeName: '',
      runs: row.runs,
      materialEfficiency: row.material_efficiency,
      timeEfficiency: row.time_efficiency,
      maxRuns: row.quantity > 0 ? row.quantity : 0,
      locationId: row.location_id,
      locationFlag: row.location_flag,
    });
  }

  /** Catalog {@link SpaceLocation} → {@link SpaceLocationV1Dto}. */
  static toSpaceLocationV1Dto(location: SpaceLocation): SpaceLocationV1Dto {
    return new SpaceLocationV1Dto({
      locationType: location.locationType,
      locationId: location.locationId,
      regionId: location.regionId,
      regionName: location.regionName,
      constellationId: location.constellationId,
      constellationName: location.constellationName,
      solarSystemId: location.solarSystemId,
      solarSystemName: location.solarSystemName,
      securityClass: location.securityClass,
      securityStatus: location.securityStatus,
      stationId: location.stationId,
      stationName: location.stationName,
      structureId: location.structureId,
      structureName: location.structureName,
      structureTypeId: location.structureTypeId,
      ownerId: location.ownerId,
      corporationId: location.corporationId,
      corporationName: location.corporationName,
    });
  }
}
