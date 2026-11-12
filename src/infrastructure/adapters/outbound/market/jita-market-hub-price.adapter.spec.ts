import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MarketPriceCache } from '@Domain/ports/market-price-cache.port.js';
import {
  JITA_REGION_ID,
  JITA_STATION_ID,
  JITA_SYSTEM_ID,
  JitaMarketHubPriceAdapter,
  type EsiRegionMarketOrder,
} from './jita-market-hub-price.adapter.js';

function order(
  partial: Partial<EsiRegionMarketOrder> &
    Pick<EsiRegionMarketOrder, 'price' | 'is_buy_order'>,
): EsiRegionMarketOrder {
  return {
    order_id: 1,
    type_id: 34,
    location_id: JITA_STATION_ID,
    volume_total: 100,
    volume_remain: 100,
    min_volume: 1,
    system_id: JITA_SYSTEM_ID,
    duration: 90,
    issued: '2026-11-07T00:00:00Z',
    range: 'station',
    ...partial,
  };
}

function memoryCache(): MarketPriceCache & {
  quotes: Map<number, unknown>;
  orders: Map<number, unknown>;
} {
  const quotes = new Map<number, unknown>();
  const orders = new Map<number, unknown>();
  return {
    quotes,
    orders,
    async getOrders(typeId) {
      return orders.get(typeId) as never;
    },
    async setOrders(typeId, value) {
      orders.set(typeId, value);
    },
    async getQuote(typeId) {
      return quotes.get(typeId) as never;
    },
    async setQuote(typeId, value) {
      quotes.set(typeId, value);
    },
  };
}

describe('JitaMarketHubPriceAdapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('aggregates best bid/ask at Jita 4-4 and write-through caches quote + orders', async () => {
    const payload: EsiRegionMarketOrder[] = [
      order({ price: 5.0, is_buy_order: true }),
      order({ price: 5.2, is_buy_order: true }),
      order({ price: 5.5, is_buy_order: false }),
      order({ price: 5.4, is_buy_order: false }),
      order({ price: 1, is_buy_order: true, location_id: 60001546 }),
      order({ price: 99, is_buy_order: false, location_id: 60001546 }),
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => '1' },
        json: async () => payload,
      }),
    );

    const cache = memoryCache();
    const adapter = new JitaMarketHubPriceAdapter(cache);
    const quote = await adapter.searchPricesForType(34);

    expect(quote).toMatchObject({ buyPrice: 5.2, sellPrice: 5.4 });
    expect(quote?.marketHub).toMatchObject({
      locationId: JITA_STATION_ID,
      regionId: JITA_REGION_ID,
      solarSystemId: JITA_SYSTEM_ID,
    });
    expect(cache.quotes.get(34)).toMatchObject({
      buyPrice: 5.2,
      sellPrice: 5.4,
    });
    expect(cache.orders.get(34)).toHaveLength(payload.length);

    const calledUrl = String(vi.mocked(fetch).mock.calls[0]?.[0]);
    expect(calledUrl).toContain(`/markets/${JITA_REGION_ID}/orders/`);
    expect(calledUrl).toContain('type_id=34');
  });

  it('returns cached quote without ESI when quote cache hits', async () => {
    const cache = memoryCache();
    const hub = JitaMarketHubPriceAdapter.jitaHub();
    await cache.setQuote(34, { buyPrice: 1, sellPrice: 2, marketHub: hub });
    vi.stubGlobal('fetch', vi.fn());

    const adapter = new JitaMarketHubPriceAdapter(cache);
    const quote = await adapter.searchPricesForType(34);

    expect(quote).toMatchObject({ buyPrice: 1, sellPrice: 2 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('uses cached orders without ESI when quote misses but orders hit', async () => {
    const cache = memoryCache();
    await cache.setOrders(34, [
      order({ price: 10, is_buy_order: true }),
      order({ price: 12, is_buy_order: false }),
    ]);
    vi.stubGlobal('fetch', vi.fn());

    const adapter = new JitaMarketHubPriceAdapter(cache);
    const quote = await adapter.searchPricesForType(34);

    expect(quote).toMatchObject({ buyPrice: 10, sellPrice: 12 });
    expect(fetch).not.toHaveBeenCalled();
    expect(cache.quotes.get(34)).toMatchObject({ buyPrice: 10, sellPrice: 12 });
  });

  it('returns undefined when hub has no buy or no sell side', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => '1' },
        json: async () => [order({ price: 5, is_buy_order: true })],
      }),
    );

    const adapter = new JitaMarketHubPriceAdapter(memoryCache());
    expect(await adapter.searchPricesForType(34)).toBeUndefined();
  });
});
