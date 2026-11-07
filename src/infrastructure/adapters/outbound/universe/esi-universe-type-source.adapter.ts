import { Injectable, Logger } from '@nestjs/common';
import { EsiClient, isNotFound } from '@lgriffin/esi.ts';
import type { UniverseTypeSource } from '@Domain/ports/universe-type-source.port.js';
import { EveItemDtoConverter } from '@Infra/adapters/inbound/converters/eve-item-dto.converter.js';
import type { EveItemV1Dto } from '@Infra/adapters/inbound/dto/eve-item-v1.dto.js';

const ESI_USER_AGENT =
  'neocom-back/0.1.0 (AdamAntinoo; https://github.com/AdamAntinoo/neocom-back)';

/**
 * Universe-type miss path from ESI (ITEM-001…006, ITEM-022):
 * `GET /universe/types/{type_id}/` plus optional group + category expansion → {@link EveItemV1Dto}.
 */
@Injectable()
export class EsiUniverseTypeSource implements UniverseTypeSource {
  private readonly logger = new Logger(EsiUniverseTypeSource.name);
  private readonly esi = new EsiClient({
    clientId: 'neocom-back-universe-types',
    userAgent: ESI_USER_AGENT,
  });

  async resolveByTypeId(typeId: number): Promise<EveItemV1Dto | undefined> {
    try {
      const type = await this.esi.universe.getTypeById(typeId);
      let group: Awaited<ReturnType<typeof this.esi.universe.getItemGroupById>> | undefined;
      let category: Awaited<ReturnType<typeof this.esi.universe.getItemCategoryById>> | undefined;
      try {
        group = await this.esi.universe.getItemGroupById(type.group_id);
        category = await this.esi.universe.getItemCategoryById(group.category_id);
      } catch (err) {
        this.logger.warn(`Universe type expansion failed for type ${typeId}: ${String(err)}`);
      }
      return EveItemDtoConverter.fromEsiType(type, group, category);
    } catch (error) {
      if (isNotFound(error)) {
        return undefined;
      }
      throw error;
    }
  }
}
