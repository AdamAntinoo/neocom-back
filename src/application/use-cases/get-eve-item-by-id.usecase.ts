import { Inject, Injectable } from '@nestjs/common';
import {
  UNIVERSE_TYPE_CACHE,
  type UniverseTypeCache,
} from '@Domain/ports/universe-type-cache.port.js';
import {
  UNIVERSE_TYPE_SOURCE,
  type UniverseTypeSource,
} from '@Domain/ports/universe-type-source.port.js';
import type { EveItemV1Dto } from '@Infra/adapters/inbound/dto/eve-item-v1.dto.js';
import {
  ExceptionCatalog,
  exceptionPayload,
} from '@Infra/adapters/exceptions/index.js';

/**
 * GetEveItemById — Redis hit or ESI/SDE resolve + write-through (ITEM-014, ITEM-018).
 * Ports are universe-type named; the interchange DTO remains {@link EveItemV1Dto}.
 */
@Injectable()
export class GetEveItemByIdUseCase {
  constructor(
    @Inject(UNIVERSE_TYPE_CACHE) private readonly cache: UniverseTypeCache,
    @Inject(UNIVERSE_TYPE_SOURCE) private readonly source: UniverseTypeSource,
  ) {}

  async execute(itemId: number): Promise<EveItemV1Dto> {
    const cached = await this.cache.get(itemId);
    if (cached) {
      return cached;
    }

    const resolved = await this.source.resolveByTypeId(itemId);
    if (!resolved) {
      throw ExceptionCatalog.EVE_ITEM_NOT_FOUND.doThrow(
        itemId,
        exceptionPayload().field('itemId').container('path').value(String(itemId)).build(),
      );
    }

    await this.cache.set(itemId, resolved);
    return resolved;
  }
}
