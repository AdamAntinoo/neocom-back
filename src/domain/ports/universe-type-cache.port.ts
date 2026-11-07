import type { EveItemV1Dto } from '@Infra/adapters/inbound/dto/eve-item-v1.dto.js';

export const UNIVERSE_TYPE_CACHE = Symbol('UNIVERSE_TYPE_CACHE');

/**
 * Permanent universe-type cache keyed by type id (ITEM-018).
 * Stores serialised {@link EveItemV1Dto}. Implementations may be Redis-backed or in-process for tests.
 */
export interface UniverseTypeCache {
  isActive(): boolean;
  get(typeId: number): Promise<EveItemV1Dto | undefined>;
  set(typeId: number, item: EveItemV1Dto): Promise<void>;
}
