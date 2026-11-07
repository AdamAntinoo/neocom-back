import { Injectable } from '@nestjs/common';
import { EsiClient, isNotFound } from '@lgriffin/esi.ts';
import type { UniverseTypeSource } from '@Domain/ports/universe-type-source.port.js';
import { EveItemDtoConverter } from '@Infra/adapters/inbound/converters/eve-item-dto.converter.js';
import type { EveItemV1Dto } from '@Infra/adapters/inbound/dto/eve-item-v1.dto.js';
import { LayerLogger } from '@Infra/config/layer-logging.js';

const ESI_USER_AGENT =
  'neocom-back/0.1.0 (AdamAntinoo; https://github.com/AdamAntinoo/neocom-back)';
const log = LayerLogger.for('outbound', 'EsiUniverseTypeSource');

/**
 * Universe-type miss path from ESI (ITEM-001…006, ITEM-022):
 * `GET /universe/types/{type_id}/` plus optional group + category expansion → {@link EveItemV1Dto}.
 */
@Injectable()
export class EsiUniverseTypeSource implements UniverseTypeSource {
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
        log.warn(`Universe type expansion failed for type ${typeId}: ${String(err)}`);
      }
      const dto = EveItemDtoConverter.fromEsiType(type, group, category);
      log.dtoConverted({
        from: 'EsiUniverseType(+group/category)',
        to: 'EveItemV1Dto',
        ids: [dto.typeId],
        fields: {
          name: dto.name,
          groupId: dto.groupId,
          expanded: group != null,
        },
      });
      return dto;
    } catch (error) {
      if (isNotFound(error)) {
        return undefined;
      }
      throw error;
    }
  }
}
