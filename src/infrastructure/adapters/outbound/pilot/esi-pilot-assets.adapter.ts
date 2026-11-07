import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  EsiClient,
  EsiTokenManager,
  isAuthError,
  isConfigurationError,
  isNetworkError,
  isNotFound,
  isServerError,
  isUnauthorized,
  type CharacterAsset,
  type AssetName,
} from '@lgriffin/esi.ts';
import type {
  PilotAssetInstance,
  PilotAssetsPort,
} from '@Domain/ports/pilot-assets.port.js';
import {
  ExceptionCatalog,
  exceptionPayload,
} from '@Infra/adapters/exceptions/index.js';
import { ESI_TOKEN_MANAGER } from '@Infra/auth/esi-token-manager.provider.js';
import { LayerLogger } from '@Infra/config/layer-logging.js';

const ESI_USER_AGENT = 'neocom-back/0.1.0 (AdamAntinoo; https://github.com/AdamAntinoo/neocom-back)';
const NAMES_CHUNK = 1000;
const log = LayerLogger.for('outbound', 'EsiPilotAssetsAdapter');

/** ESI surface used for character assets + personal names (AST-005…006). */
export interface EsiPilotAssetsApi {
  assets: {
    getCharacterAssets(characterId: number): Promise<CharacterAsset[]>;
    postCharacterAssetNames(characterId: number, itemIds: number[]): Promise<AssetName[]>;
  };
}

/**
 * Authenticated ESI adapter — PilotPort assets entry implemented in neocom-back (AST-009).
 */
@Injectable()
export class EsiPilotAssetsAdapter implements PilotAssetsPort, OnModuleDestroy {
  private readonly clients = new Map<number, EsiClient>();

  constructor(@Inject(ESI_TOKEN_MANAGER) private readonly tokens: EsiTokenManager) {}

  async findAssetsByPilotId(pilotId: number): Promise<PilotAssetInstance[]> {
    const esi = await this.clientFor(pilotId);
    return readPilotAssetsFromEsi(esi, pilotId);
  }

  async onModuleDestroy(): Promise<void> {
    for (const client of this.clients.values()) {
      client.shutdown();
    }
    this.clients.clear();
  }

  private async clientFor(pilotId: number): Promise<EsiClient> {
    const existing = this.clients.get(pilotId);
    if (existing) {
      return existing;
    }
    try {
      const client = await this.tokens.createClient(pilotId, { userAgent: ESI_USER_AGENT });
      this.clients.set(pilotId, client);
    } catch {
      throw ExceptionCatalog.TOKEN_UNAVAILABLE.doThrow();
    }
    return this.clients.get(pilotId)!;
  }
}

export async function readPilotAssetsFromEsi(
  esi: EsiPilotAssetsApi,
  pilotId: number,
): Promise<PilotAssetInstance[]> {
  try {
    const rows = await esi.assets.getCharacterAssets(pilotId);
    const names = await loadAssetNames(esi, pilotId, rows.map((r) => r.item_id));
    const mapped = rows.map((row) => mapRow(row, pilotId, names.get(row.item_id)));
    log.dtoConverted({
      from: 'CharacterAsset(+names)',
      to: 'PilotAssetInstance',
      count: mapped.length,
      ids: mapped.map((r) => r.itemId),
      fields: { pilotId, named: mapped.filter((r) => r.name != null).length },
    });
    return mapped;
  } catch (error) {
    if (isNotFound(error)) {
      throw ExceptionCatalog.ASSETS_NOT_FOUND.doThrow(
        String(pilotId),
        exceptionPayload().field('pilotId').container('path').value(String(pilotId)).build(),
      );
    }
    if (isUnauthorized(error) || isAuthError(error) || isConfigurationError(error)) {
      throw ExceptionCatalog.TOKEN_UNAVAILABLE.doThrow();
    }
    if (isNetworkError(error) || isServerError(error)) {
      throw ExceptionCatalog.ESI_ASSETS_UNAVAILABLE.doThrow(
        exceptionPayload().field('pilotId').container('path').value(String(pilotId)).build(),
      );
    }
    throw error;
  }
}

async function loadAssetNames(
  esi: EsiPilotAssetsApi,
  pilotId: number,
  itemIds: number[],
): Promise<Map<number, string>> {
  const byId = new Map<number, string>();
  if (itemIds.length === 0) {
    return byId;
  }
  for (let i = 0; i < itemIds.length; i += NAMES_CHUNK) {
    const chunk = itemIds.slice(i, i + NAMES_CHUNK);
    const names = await esi.assets.postCharacterAssetNames(pilotId, chunk);
    for (const entry of names) {
      byId.set(entry.item_id, entry.name);
    }
  }
  return byId;
}

function mapRow(
  row: CharacterAsset,
  ownerPilotId: number,
  rawName: string | undefined,
): PilotAssetInstance {
  const name = normalizePersonalName(rawName);
  return {
    itemId: row.item_id,
    typeId: row.type_id,
    quantity: row.quantity,
    locationId: row.location_id,
    locationType: row.location_type,
    locationFlag: row.location_flag,
    isSingleton: row.is_singleton,
    ...(row.is_blueprint_copy !== undefined ? { isBlueprintCopy: row.is_blueprint_copy } : {}),
    ...(name !== undefined ? { name } : {}),
    ownerPilotId,
  };
}

/** ESI may return literal `"None"` — treat as absent (apply-time decision). */
function normalizePersonalName(name: string | undefined): string | undefined {
  if (name === undefined || name === '' || name === 'None') {
    return undefined;
  }
  return name;
}
