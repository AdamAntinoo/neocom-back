import type { EsiClient } from '@lgriffin/esi.ts';
import type { SpaceLocation } from '@Domain/spacelocation/space-location.js';
import { BlueprintV1Dto } from '@Infra/adapters/inbound/dto/blueprint-v1.dto.js';
import { EveItemV1Dto } from '@Infra/adapters/inbound/dto/eve-item-v1.dto.js';
import { SpaceLocationV1Dto } from '@Infra/adapters/inbound/dto/space-location-v1.dto.js';
import { LayerLogger } from '@Infra/config/layer-logging.js';

const log = LayerLogger.for('outbound', 'EveItemDtoConverter');

/** One element of {@link EsiClient.characters.getCharacterBlueprints}. */
export type EsiCharacterBlueprint = Awaited<
  ReturnType<EsiClient['characters']['getCharacterBlueprints']>
>[number];

/** ESI `GET /universe/types/{type_id}/` payload shape from `@lgriffin/esi.ts`. */
export type EsiUniverseType = Awaited<ReturnType<EsiClient['universe']['getTypeById']>>;
/** ESI `GET /universe/groups/{group_id}/` payload. */
export type EsiItemGroup = Awaited<ReturnType<EsiClient['universe']['getItemGroupById']>>;
/** ESI `GET /universe/categories/{category_id}/` payload. */
export type EsiItemCategory = Awaited<
  ReturnType<EsiClient['universe']['getItemCategoryById']>
>;

/**
 * Static origin→DTO conversions for back interchange (blueprints, locations, eve items).
 * Do not instantiate — use static methods only.
 */
export class EveItemDtoConverter {
  private constructor() {}

  /** ESI library character blueprint → {@link BlueprintV1Dto}. */
  static toBlueprintV1Dto(row: EsiCharacterBlueprint): BlueprintV1Dto {
    const dto = new BlueprintV1Dto({
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
    log.dtoConverted({
      from: 'EsiCharacterBlueprint',
      to: 'BlueprintV1Dto',
      ids: [dto.blueprintId],
      fields: { blueprintTypeId: dto.blueprintTypeId, locationId: dto.locationId },
    });
    return dto;
  }

  /** Catalog {@link SpaceLocation} → {@link SpaceLocationV1Dto}. */
  static toSpaceLocationV1Dto(location: SpaceLocation): SpaceLocationV1Dto {
    const dto = new SpaceLocationV1Dto({
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
    log.dtoConverted({
      from: 'SpaceLocation',
      to: 'SpaceLocationV1Dto',
      ids: [dto.locationId],
      fields: { locationType: dto.locationType },
    });
    return dto;
  }

  /**
   * Baseline map: all ESI type fields → camelCase DTO (ITEM-001…003).
   * Does not resolve group/category/`iconUrl` — use {@link withExpansions}.
   */
  static toEveItemV1Dto(type: EsiUniverseType): EveItemV1Dto {
    const dto = new EveItemV1Dto({
      typeId: type.type_id,
      name: type.name,
      description: type.description,
      published: type.published,
      groupId: type.group_id,
      ...(type.capacity !== undefined ? { capacity: type.capacity } : {}),
      ...(type.dogma_attributes !== undefined
        ? {
            dogmaAttributes: type.dogma_attributes.map((a) => ({
              attributeId: a.attribute_id,
              value: a.value,
            })),
          }
        : {}),
      ...(type.dogma_effects !== undefined
        ? {
            dogmaEffects: type.dogma_effects.map((e) => ({
              effectId: e.effect_id,
              isDefault: e.is_default,
            })),
          }
        : {}),
      ...(type.graphic_id !== undefined ? { graphicId: type.graphic_id } : {}),
      ...(type.icon_id !== undefined ? { iconId: type.icon_id } : {}),
      ...(type.market_group_id !== undefined
        ? { marketGroupId: type.market_group_id }
        : {}),
      ...(type.mass !== undefined ? { mass: type.mass } : {}),
      ...(type.packaged_volume !== undefined
        ? { packagedVolume: type.packaged_volume }
        : {}),
      ...(type.portion_size !== undefined ? { portionSize: type.portion_size } : {}),
      ...(type.radius !== undefined ? { radius: type.radius } : {}),
      ...(type.volume !== undefined ? { volume: type.volume } : {}),
    });
    log.dtoConverted({
      from: 'EsiUniverseType',
      to: 'EveItemV1Dto',
      ids: [dto.typeId],
      fields: { name: dto.name, groupId: dto.groupId },
    });
    return dto;
  }

  /**
   * Apply group → category expansions and `iconUrl` (ITEM-004…006).
   * Pass group/category already loaded via ESI (or SDE equivalent).
   */
  static withExpansions(
    item: EveItemV1Dto,
    group?: Pick<EsiItemGroup, 'name' | 'category_id'> | null,
    category?: Pick<EsiItemCategory, 'name'> | null,
  ): EveItemV1Dto {
    const next = new EveItemV1Dto({ ...item });
    if (group != null) {
      next.groupName = group.name;
      next.categoryId = group.category_id;
    }
    if (category != null) {
      next.categoryName = category.name;
    }
    if (next.iconId != null && next.iconId > 0 && next.typeId > 0) {
      next.iconUrl = EveItemDtoConverter.typeIconUrl(next.typeId);
    }
    return next;
  }

  /**
   * Full map: ESI type + optional group + category → expanded {@link EveItemV1Dto}.
   */
  static fromEsiType(
    type: EsiUniverseType,
    group?: Pick<EsiItemGroup, 'name' | 'category_id'> | null,
    category?: Pick<EsiItemCategory, 'name'> | null,
  ): EveItemV1Dto {
    return EveItemDtoConverter.withExpansions(
      EveItemDtoConverter.toEveItemV1Dto(type),
      group,
      category,
    );
  }

  /** Programme type-icon Image Server URL (ITEM-006). */
  static typeIconUrl(typeId: number, size?: number): string {
    const base = `https://images.evetech.net/types/${typeId}/icon`;
    return size != null ? `${base}?size=${size}` : base;
  }
}
