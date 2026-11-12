import { EveItemV1Dto } from './eve-item-v1.dto.js';
import type { EveLocationV1Dto } from './eve-location-v1.dto.js';

/**
 * EveItem plus hub-scoped buy/sell. Buy/sell SHALL be interpreted only together with
 * {@link marketHub} (ITEM-012). Serialisation nests `marketHub` as a JSON object (ITEM-013).
 */
export class PricedItemV1Dto extends EveItemV1Dto {
  override jsonClass: string = 'PricedItemV1Dto';
  buyPrice = 0;
  sellPrice = 0;
  /** Nested EveLocationV1Dto for the market hub — never a bare location id. */
  marketHub!: EveLocationV1Dto;

  constructor(values: Partial<PricedItemV1Dto> = {}) {
    super(values);
    Object.assign(this, values);
    this.jsonClass = 'PricedItemV1Dto';
  }

  /**
   * Build a priced item from a full EveItem payload plus hub prices.
   * Requires an explicit {@link EveLocationV1Dto} hub (ITEM-011 / ITEM-012).
   */
  static fromEveItem(
    item: EveItemV1Dto,
    buyPrice: number,
    sellPrice: number,
    marketHub: EveLocationV1Dto,
  ): PricedItemV1Dto {
    if (marketHub == null || typeof marketHub !== 'object') {
      throw new Error(
        'PricedItemV1Dto requires marketHub as EveLocationV1Dto (not a bare id)',
      );
    }
    return new PricedItemV1Dto({
      ...item,
      buyPrice,
      sellPrice,
      marketHub,
      jsonClass: 'PricedItemV1Dto',
    });
  }
}
