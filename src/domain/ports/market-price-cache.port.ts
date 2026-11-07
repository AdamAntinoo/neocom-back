import type { HubPriceQuote } from '@Domain/ports/market-hub-price.port.js';

export const MARKET_PRICE_CACHE = Symbol('MARKET_PRICE_CACHE');

/** Serialisable ESI region order rows used for hub price processing (ITEM-025). */
export interface MarketOrderRow {
  order_id: number;
  type_id: number;
  location_id: number;
  price: number;
  is_buy_order: boolean;
}

export type MarketOrderSnapshot = ReadonlyArray<MarketOrderRow>;

/**
 * Write-through market caches (ITEM-025 / ITEM-026):
 * - order snapshots for price processing (TTL 5 minutes)
 * - calculated hub buy/sell quotes by type id (TTL 5 minutes)
 */
export interface MarketPriceCache {
  getOrders(typeId: number): Promise<MarketOrderSnapshot | undefined>;
  setOrders(typeId: number, orders: MarketOrderSnapshot): Promise<void>;
  getQuote(typeId: number): Promise<HubPriceQuote | undefined>;
  setQuote(typeId: number, quote: HubPriceQuote): Promise<void>;
}
