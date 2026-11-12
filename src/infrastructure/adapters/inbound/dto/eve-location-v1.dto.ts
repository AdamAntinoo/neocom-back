import type { LocationIdentifierType } from '@Domain/spacelocation/space-location.js';
import { SpaceLocationV1Dto } from './space-location-v1.dto.js';

/**
 * Location kinds for {@link EveLocationV1Dto}: SpaceLocation set plus planet / ship / cargo hold.
 */
export type EveLocationIdentifierType =
  LocationIdentifierType | 'PLANET' | 'SHIP' | 'CARGO_HOLD';

/**
 * Back ↔ front interchange for a multi-kind EVE location (EPIC-012 / ITEM-011 nested hub).
 * Extends {@link SpaceLocationV1Dto} with expanded location kinds and hub/nesting fields.
 */
export class EveLocationV1Dto extends SpaceLocationV1Dto<EveLocationIdentifierType> {
  override jsonClass: string = 'EveLocationV1Dto';

  planetId?: number;
  planetName?: string;
  shipId?: number;
  shipName?: string;
  shipTypeId?: number;
  cargoHoldId?: string | number;
  cargoHoldName?: string;
  parentLocation?: EveLocationV1Dto | null;
  /** When true, usable as a market hub for PricedItem pricing (planet/station kinds). */
  marketHub?: boolean;

  constructor(values: Partial<EveLocationV1Dto> = {}) {
    super(values);
    Object.assign(this, values);
    this.jsonClass = 'EveLocationV1Dto';
  }
}
