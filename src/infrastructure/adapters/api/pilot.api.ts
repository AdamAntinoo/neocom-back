import type { PilotV2, PublicPilotV1 } from 'neocom-domain';
import type { PilotAssetNode } from '@Infra/adapters/inbound/dto/located-asset-container-v1.dto.js';
import type { AccessCookieValue } from '@Infra/adapters/services/auth-cookies.service.js';

export interface PilotApi {
  getPilot(pilotId: number): Promise<PublicPilotV1 | PilotV2>;
  getPilotAssets(pilotId: number, req?: unknown): Promise<PilotAssetNode[]>;
  getPilotAssetsByLocation(
    pilotId: number,
    locationId: number,
    req?: unknown,
  ): Promise<PilotAssetNode[]>;
}

/** Optional helper type for authenticated pilot asset calls. */
export type PilotAssetsAuth = AccessCookieValue | null;
