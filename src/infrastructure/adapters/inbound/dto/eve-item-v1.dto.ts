import { Record } from './record.js';

export type EveItemDogmaAttribute = { attributeId: number; value: number };
export type EveItemDogmaEffect = { effectId: number; isDefault: boolean };

/**
 * Back interchange for one EVE universe item class (ESI type + expansions).
 * Consumers that need a full type definition SHALL obtain it via this DTO (or a later
 * published domain type mapped from it), not by calling ESI types/groups/categories
 * from the browser (ITEM-007).
 */
export class EveItemV1Dto extends Record {
  override jsonClass: string = 'EveItemV1Dto';

  /** ESI `type_id`. */
  typeId = 0;
  name = '';
  description = '';
  published = false;
  groupId = 0;

  capacity?: number;
  dogmaAttributes?: EveItemDogmaAttribute[];
  dogmaEffects?: EveItemDogmaEffect[];
  graphicId?: number;
  iconId?: number;
  marketGroupId?: number;
  mass?: number;
  packagedVolume?: number;
  portionSize?: number;
  radius?: number;
  volume?: number;

  /** Expanded from ESI group. */
  groupName?: string;
  /** Expanded from ESI group → category. */
  categoryId?: number;
  categoryName?: string;
  /** Resolved EVE Image Server URL when `iconId` is present (URL string only). */
  iconUrl?: string;

  constructor(values: Partial<EveItemV1Dto> = {}) {
    super(values);
    Object.assign(this, values);
    this.jsonClass = 'EveItemV1Dto';
  }
}
