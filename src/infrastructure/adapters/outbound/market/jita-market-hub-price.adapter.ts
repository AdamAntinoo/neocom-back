import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  HubPriceQuote,
  MarketHubPricePort,
} from '@Domain/ports/market-hub-price.port.js';
import {
  MARKET_PRICE_CACHE,
  type MarketOrderSnapshot,
  type MarketPriceCache,
} from '@Domain/ports/market-price-cache.port.js';
import { EveLocationV1Dto } from '@Infra/adapters/inbound/dto/eve-location-v1.dto.js';

const ESI_USER_AGENT =
  'neocom-back/0.1.0 (AdamAntinoo; https://github.com/AdamAntinoo/neocom-back)';

/** The Forge — Jita's region (ITEM-024). */
export const JITA_REGION_ID = 10000002;
/** Jita solar system. */
export const JITA_SYSTEM_ID = 30000142;
/** Jita IV - Moon 4 - Caldari Navy Assembly Plant (Jita 4-4). */
export const JITA_STATION_ID = 60003760;

const ESI_ORDERS_BASE = `https://esi.evetech.net/latest/markets/${JITA_REGION_ID}/orders/`;

/** One ESI region market order row (`GET /markets/{region_id}/orders`). */
export interface EsiRegionMarketOrder {
  order_id: number;
  type_id: number;
  location_id: number;
  volume_total: number;
  volume_remain: number;
  min_volume: number;
  price: number;
  is_buy_order: boolean;
  system_id: number;
  duration: number;
  issued: string;
  range: string;
}

/**
 * Programme Jita market hub prices from ESI The Forge region orders (ITEM-024 / DEF-EI-003).
 * Orders + calculated quotes write-through Redis TTL 5 minutes (ITEM-025 / ITEM-026).
 */
@Injectable()
export class JitaMarketHubPriceAdapter implements MarketHubPricePort {
  private readonly logger = new Logger(JitaMarketHubPriceAdapter.name);

  constructor(
    @Inject(MARKET_PRICE_CACHE) private readonly priceCache: MarketPriceCache,
  ) {}

  static jitaHub(): EveLocationV1Dto {
    return new EveLocationV1Dto({
      locationType: 'STATION',
      locationId: JITA_STATION_ID,
      stationId: JITA_STATION_ID,
      stationName: 'Jita IV - Moon 4 - Caldari Navy Assembly Plant',
      solarSystemId: JITA_SYSTEM_ID,
      solarSystemName: 'Jita',
      regionId: JITA_REGION_ID,
      regionName: 'The Forge',
      marketHub: true,
    });
  }

  async searchPricesForType(
    typeId: number,
  ): Promise<HubPriceQuote | undefined> {
    const cachedQuote = await this.priceCache.getQuote(typeId);
    if (cachedQuote) {
      return cachedQuote;
    }

    const orders = await this.ordersForType(typeId);
    const quote = this.quoteFromOrders(orders);
    if (quote) {
      await this.priceCache.setQuote(typeId, quote);
    }
    return quote;
  }

  private quoteFromOrders(
    orders: MarketOrderSnapshot,
  ): HubPriceQuote | undefined {
    const atHub = orders.filter((o) => o.location_id === JITA_STATION_ID);
    const buyPrices = atHub.filter((o) => o.is_buy_order).map((o) => o.price);
    const sellPrices = atHub.filter((o) => !o.is_buy_order).map((o) => o.price);

    if (buyPrices.length === 0 || sellPrices.length === 0) {
      return undefined;
    }

    return {
      buyPrice: Math.max(...buyPrices),
      sellPrice: Math.min(...sellPrices),
      marketHub: JitaMarketHubPriceAdapter.jitaHub(),
    };
  }

  /** ITEM-025: write-through order snapshot (5 min) before ESI miss. */
  private async ordersForType(typeId: number): Promise<MarketOrderSnapshot> {
    const cached = await this.priceCache.getOrders(typeId);
    if (cached) {
      return cached;
    }
    const fetched = await this.fetchOrdersForType(typeId);
    await this.priceCache.setOrders(typeId, fetched);
    return fetched;
  }

  /**
   * ESI `GET /markets/10000002/orders` with `type_id` query (same endpoint; avoids full-region download).
   */
  private async fetchOrdersForType(
    typeId: number,
  ): Promise<EsiRegionMarketOrder[]> {
    const collected: EsiRegionMarketOrder[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const url = new URL(ESI_ORDERS_BASE);
      url.searchParams.set('datasource', 'tranquility');
      url.searchParams.set('order_type', 'all');
      url.searchParams.set('type_id', String(typeId));
      url.searchParams.set('page', String(page));

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': ESI_USER_AGENT,
        },
      });

      if (!response.ok) {
        this.logger.warn(
          `ESI market orders failed for type ${typeId} page ${page}: ${response.status}`,
        );
        return collected;
      }

      totalPages = Number(response.headers.get('x-pages') ?? '1') || 1;
      const body = (await response.json()) as EsiRegionMarketOrder[];
      if (Array.isArray(body)) {
        collected.push(...body);
      }
      page += 1;
    }

    return collected;
  }
}
