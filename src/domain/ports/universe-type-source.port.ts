import type { EveItemV1Dto } from '@Infra/adapters/inbound/dto/eve-item-v1.dto.js';

export const UNIVERSE_TYPE_SOURCE = Symbol('UNIVERSE_TYPE_SOURCE');

/**
 * Resolve one universe type into {@link EveItemV1Dto} on cache miss (ITEM-018).
 * ESI implementation reads `/universe/types/{type_id}/` (ITEM-022).
 */
export interface UniverseTypeSource {
  resolveByTypeId(typeId: number): Promise<EveItemV1Dto | undefined>;
}
