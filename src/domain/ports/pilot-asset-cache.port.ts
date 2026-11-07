import type { PilotAssetNode } from '@Infra/adapters/inbound/dto/located-asset-container-v1.dto.js';

export const PILOT_ASSET_CACHE = Symbol('PILOT_ASSET_CACHE');

/** Asset list Redis TTL — 60 minutes (AST-014). */
export const PILOT_ASSET_CACHE_TTL_SECONDS = 60 * 60;

/**
 * Write-through cache for expanded EveAsset lists under the `pilot/asset` key space (AST-014).
 */
export interface PilotAssetCache {
  get(pilotId: number): Promise<PilotAssetNode[] | undefined>;
  set(pilotId: number, assets: PilotAssetNode[]): Promise<void>;
}
