/**
 * Back-owned PilotPort assets entry (AST-009).
 * New models stay in `neocom-back` — `neocom-domain` PilotPort is not extended.
 */
export const PILOT_ASSETS_PORT = Symbol('PILOT_ASSETS_PORT');

/** ESI character asset instance fields after names join; before type/location expansion. */
export interface PilotAssetInstance {
  itemId: number;
  typeId: number;
  quantity: number;
  locationId: number;
  locationType: string;
  locationFlag: string;
  isSingleton: boolean;
  isBlueprintCopy?: boolean;
  name?: string;
  ownerPilotId: number;
}

/**
 * Retrieve a pilot’s character assets from ESI (list + personal names).
 * Expansion into EveAsset DTOs / Redis is the use-case layer.
 */
export interface PilotAssetsPort {
  findAssetsByPilotId(pilotId: number): Promise<PilotAssetInstance[]>;
}
