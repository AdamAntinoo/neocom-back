import { Inject, Injectable } from '@nestjs/common';
import { NeocomBackendError } from 'neocom-domain';
import {
  PILOT_ASSET_CACHE,
  type PilotAssetCache,
} from '@Domain/ports/pilot-asset-cache.port.js';
import {
  PILOT_ASSETS_PORT,
  type PilotAssetInstance,
  type PilotAssetsPort,
} from '@Domain/ports/pilot-assets.port.js';
import type { AccessCookieValue } from '@Infra/adapters/services/auth-cookies.service.js';
import { EveAssetV1Dto } from '@Infra/adapters/inbound/dto/eve-asset-v1.dto.js';
import {
  LocatedAssetContainerV1Dto,
  type PilotAssetNode,
} from '@Infra/adapters/inbound/dto/located-asset-container-v1.dto.js';
import { EveLocationV1Dto } from '@Infra/adapters/inbound/dto/eve-location-v1.dto.js';
import { PricedItemV1Dto } from '@Infra/adapters/inbound/dto/priced-item-v1.dto.js';
import { EveItemDtoConverter } from '@Infra/adapters/inbound/converters/eve-item-dto.converter.js';
import { JitaMarketHubPriceAdapter } from '@Infra/adapters/outbound/market/jita-market-hub-price.adapter.js';
import {
  ExceptionCatalog,
  exceptionPayload,
} from '@Infra/adapters/exceptions/index.js';
import { LayerLogger } from '@Infra/config/layer-logging.js';
import { GetPricedItemByIdUseCase } from './get-priced-item-by-id.usecase.js';
import { GetEveItemByIdUseCase } from './get-eve-item-by-id.usecase.js';
import { GetSpaceLocationUseCase } from './get-space-location.usecase.js';

const LOCATION_EMBED_SKIP = new Set(['LOCATION_NOT_FOUND', 'FORBIDDEN', 'UNAUTHORIZED']);
const log = LayerLogger.for('application', 'GetPilotAssetsUseCase');

/**
 * Authenticated retrieve-pilot-assets use case (AST-007…009, AST-013…014).
 * ESI via PilotAssetsPort → expand → nest containers → Redis write-through.
 */
@Injectable()
export class GetPilotAssetsUseCase {
  constructor(
    @Inject(PILOT_ASSETS_PORT) private readonly assets: PilotAssetsPort,
    @Inject(PILOT_ASSET_CACHE) private readonly cache: PilotAssetCache,
    private readonly getPricedItemById: GetPricedItemByIdUseCase,
    private readonly getEveItemById: GetEveItemByIdUseCase,
    private readonly getSpaceLocation: GetSpaceLocationUseCase,
  ) {}

  async execute(pilotId: number, auth: AccessCookieValue | null): Promise<PilotAssetNode[]> {
    this.requireAuth(pilotId, auth);
    const cached = await this.cache.get(pilotId);
    if (cached) {
      return cached;
    }
    const instances = await this.assets.findAssetsByPilotId(pilotId);
    const expanded = await this.expandAll(instances, auth!);
    const tree = nestContainers(expanded);
    await this.cache.set(pilotId, tree);
    return tree;
  }

  /**
   * Full list filtered to assets matching the given location (AST-013).
   * Uses warm Redis full list when present.
   */
  async executeForLocation(
    pilotId: number,
    locationId: number,
    auth: AccessCookieValue | null,
  ): Promise<PilotAssetNode[]> {
    const all = await this.execute(pilotId, auth);
    return all.filter((node) => node.locationId === locationId);
  }

  private requireAuth(pilotId: number, auth: AccessCookieValue | null): void {
    if (auth == null) {
      throw ExceptionCatalog.ASSETS_AUTH_REQUIRED.doThrow(
        pilotId,
        exceptionPayload().field('cookie').container('header').value(String(pilotId)).build(),
      );
    }
  }

  private async expandAll(
    instances: PilotAssetInstance[],
    auth: AccessCookieValue,
  ): Promise<EveAssetV1Dto[]> {
    const pricedByType = new Map<number, PricedItemV1Dto>();
    const locationById = new Map<number, EveLocationV1Dto | undefined>();

    const uniqueTypes = [...new Set(instances.map((i) => i.typeId))];
    await Promise.all(
      uniqueTypes.map(async (typeId) => {
        pricedByType.set(typeId, await this.resolvePricedItem(typeId, auth));
      }),
    );

    const placeIds = [
      ...new Set(
        instances.filter((i) => i.locationType !== 'item').map((i) => i.locationId),
      ),
    ];
    await Promise.all(
      placeIds.map(async (locationId) => {
        locationById.set(locationId, await this.resolveLocation(locationId, auth));
      }),
    );

    const dtos = instances.map((row) => {
      const dto = new EveAssetV1Dto({
        itemId: row.itemId,
        typeId: row.typeId,
        quantity: row.quantity,
        locationId: row.locationId,
        locationType: row.locationType,
        locationFlag: row.locationFlag,
        isSingleton: row.isSingleton,
        ...(row.isBlueprintCopy !== undefined ? { isBlueprintCopy: row.isBlueprintCopy } : {}),
        ...(row.name !== undefined ? { name: row.name } : {}),
        ownerPilotId: row.ownerPilotId,
        item: pricedByType.get(row.typeId)!,
      });
      if (row.locationType !== 'item') {
        const location = locationById.get(row.locationId);
        if (location) {
          dto.location = location;
        }
      }
      return dto;
    });
    log.dtoConverted({
      from: 'PilotAssetInstance',
      to: 'EveAssetV1Dto',
      count: dtos.length,
      ids: dtos.map((d) => d.itemId),
      fields: {
        types: uniqueTypes.length,
        placeLocations: placeIds.length,
        withLocationEmbed: dtos.filter((d) => d.location != null).length,
      },
    });
    return dtos;
  }

  private async resolvePricedItem(
    typeId: number,
    auth: AccessCookieValue,
  ): Promise<PricedItemV1Dto> {
    try {
      return await this.getPricedItemById.execute(typeId, auth);
    } catch (error) {
      if (
        error instanceof NeocomBackendError &&
        error.errors.some((e) => e.code === 'MARKET_PRICE_NOT_FOUND')
      ) {
        const item = await this.getEveItemById.execute(typeId);
        return PricedItemV1Dto.fromEveItem(item, 0, 0, JitaMarketHubPriceAdapter.jitaHub());
      }
      throw error;
    }
  }

  private async resolveLocation(
    locationId: number,
    auth: AccessCookieValue,
  ): Promise<EveLocationV1Dto | undefined> {
    try {
      const space = await this.getSpaceLocation.execute(locationId, auth);
      return new EveLocationV1Dto({
        ...EveItemDtoConverter.toSpaceLocationV1Dto(space),
        jsonClass: 'EveLocationV1Dto',
      });
    } catch (error) {
      if (
        error instanceof NeocomBackendError &&
        error.errors.some((e) => LOCATION_EMBED_SKIP.has(e.code))
      ) {
        return undefined;
      }
      throw error;
    }
  }
}

/**
 * When location_type is item, hang child under parent itemId as LocatedAssetContainerV1 (AST-012).
 * Returns root nodes (locationType ≠ item, or orphan item-refs).
 */
export function nestContainers(assets: EveAssetV1Dto[]): PilotAssetNode[] {
  const byId = new Map<number, EveAssetV1Dto>();
  for (const asset of assets) {
    byId.set(asset.itemId, asset);
  }

  const childrenByParent = new Map<number, EveAssetV1Dto[]>();
  const childIds = new Set<number>();
  for (const asset of assets) {
    if (asset.locationType !== 'item') {
      continue;
    }
    const parent = byId.get(asset.locationId);
    if (!parent) {
      continue;
    }
    childIds.add(asset.itemId);
    const list = childrenByParent.get(parent.itemId) ?? [];
    list.push(asset);
    childrenByParent.set(parent.itemId, list);
  }

  const containers = new Map<number, LocatedAssetContainerV1Dto>();

  function asNode(asset: EveAssetV1Dto): PilotAssetNode {
    const kids = childrenByParent.get(asset.itemId);
    if (!kids || kids.length === 0) {
      return asset;
    }
    const existing = containers.get(asset.itemId);
    if (existing) {
      return existing;
    }
    const container = new LocatedAssetContainerV1Dto({
      ...asset,
      contents: kids.map((c) => asNode(c)),
    });
    containers.set(asset.itemId, container);
    return container;
  }

  const roots: PilotAssetNode[] = [];
  for (const asset of assets) {
    if (childIds.has(asset.itemId)) {
      continue;
    }
    roots.push(asNode(asset));
  }
  log.dtoConverted({
    from: 'EveAssetV1Dto[]',
    to: 'PilotAssetNode[]',
    count: roots.length,
    ids: roots.map((r) => r.itemId),
    fields: { containers: containers.size, nestedChildren: childIds.size },
  });
  return roots;
}
