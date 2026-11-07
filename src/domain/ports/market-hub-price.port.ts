import type { EveLocationV1Dto } from '@Infra/adapters/inbound/dto/eve-location-v1.dto.js';

export const MARKET_HUB_PRICE = Symbol('MARKET_HUB_PRICE');

export interface HubPriceQuote {
  buyPrice: number;
  sellPrice: number;
  marketHub: EveLocationV1Dto;
}

/**
 * Search hub price data for one item type (ITEM-019 / ITEM-024).
 * Programme source: ESI The Forge region orders filtered to Jita 4-4.
 */
export interface MarketHubPricePort {
  searchPricesForType(typeId: number): Promise<HubPriceQuote | undefined>;
}
