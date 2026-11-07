import { Record } from './record.js';
import type { EveLocationV1Dto } from './eve-location-v1.dto.js';
import type { PricedItemV1Dto } from './priced-item-v1.dto.js';

/**
 * Back ↔ front interchange for a pilot-owned asset instance (AST-001…002).
 * Raw ESI asset/type/location payloads stay server-internal.
 */
export class EveAssetV1Dto extends Record {
  override jsonClass: string = 'EveAssetV1Dto';
  itemId = 0;
  typeId = 0;
  quantity = 0;
  locationId = 0;
  locationType = '';
  locationFlag = '';
  isSingleton = false;
  isBlueprintCopy?: boolean;
  name?: string;
  ownerPilotId = 0;
  /** Required expansion of typeId (AST-003). */
  item!: PricedItemV1Dto;
  /** Expansion of locationId when locationType ≠ item (AST-004). */
  location?: EveLocationV1Dto;

  constructor(values: Partial<EveAssetV1Dto> = {}) {
    super(values);
    Object.assign(this, values);
    this.jsonClass = 'EveAssetV1Dto';
  }
}
