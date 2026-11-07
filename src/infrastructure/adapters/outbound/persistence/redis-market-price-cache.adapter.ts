import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { HubPriceQuote } from '@Domain/ports/market-hub-price.port.js';
import type {
  MarketOrderSnapshot,
  MarketPriceCache,
} from '@Domain/ports/market-price-cache.port.js';
import { EveLocationV1Dto } from '@Infra/adapters/inbound/dto/eve-location-v1.dto.js';

const ORDERS_PREFIX = 'neocom:market:orders:forge:';
const QUOTE_PREFIX = 'neocom:market:hub-price:60003760:';
/** ITEM-025 / ITEM-026 — 5 minute volatility window. */
export const MARKET_PRICE_CACHE_TTL_SECONDS = 5 * 60;

/**
 * Redis write-through cache for market order snapshots and calculated hub quotes.
 * Inactive when REDIS_URL is unset or connect fails.
 */
@Injectable()
export class RedisMarketPriceCache implements MarketPriceCache, OnModuleDestroy {
  private readonly logger = new Logger(RedisMarketPriceCache.name);
  private client: Redis | null = null;
  private active = false;

  constructor(config: ConfigService) {
    const redisUrl = config.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.log('REDIS_URL unset — market price cache inactive (ESI-only)');
      return;
    }
    try {
      this.client = new Redis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true });
      void this.connect().catch((err: unknown) => {
        this.logger.warn(`Market-price Redis connect failed: ${String(err)}`);
        this.active = false;
        this.client = null;
      });
    } catch (err) {
      this.logger.warn(`Market-price Redis unavailable: ${String(err)}`);
      this.client = null;
    }
  }

  private async connect(): Promise<void> {
    if (!this.client) {
      return;
    }
    await this.client.connect();
    this.active = true;
    this.logger.log('Market-price Redis cache connected');
  }

  isActive(): boolean {
    return this.active && this.client !== null;
  }

  async getOrders(typeId: number): Promise<MarketOrderSnapshot | undefined> {
    if (!this.isActive() || !this.client) {
      return undefined;
    }
    try {
      const raw = await this.client.get(`${ORDERS_PREFIX}${typeId}`);
      if (!raw) {
        return undefined;
      }
      const parsed = JSON.parse(raw) as MarketOrderSnapshot;
      return Array.isArray(parsed) ? parsed : undefined;
    } catch (err) {
      this.logger.warn(`Market orders Redis get failed: ${String(err)}`);
      return undefined;
    }
  }

  async setOrders(typeId: number, orders: MarketOrderSnapshot): Promise<void> {
    if (!this.isActive() || !this.client) {
      return;
    }
    try {
      await this.client.set(
        `${ORDERS_PREFIX}${typeId}`,
        JSON.stringify(orders),
        'EX',
        MARKET_PRICE_CACHE_TTL_SECONDS,
      );
    } catch (err) {
      this.logger.warn(`Market orders Redis set failed: ${String(err)}`);
    }
  }

  async getQuote(typeId: number): Promise<HubPriceQuote | undefined> {
    if (!this.isActive() || !this.client) {
      return undefined;
    }
    try {
      const raw = await this.client.get(`${QUOTE_PREFIX}${typeId}`);
      if (!raw) {
        return undefined;
      }
      const parsed = JSON.parse(raw) as {
        buyPrice: number;
        sellPrice: number;
        marketHub: Partial<EveLocationV1Dto>;
      };
      return {
        buyPrice: parsed.buyPrice,
        sellPrice: parsed.sellPrice,
        marketHub: new EveLocationV1Dto(parsed.marketHub ?? {}),
      };
    } catch (err) {
      this.logger.warn(`Market quote Redis get failed: ${String(err)}`);
      return undefined;
    }
  }

  async setQuote(typeId: number, quote: HubPriceQuote): Promise<void> {
    if (!this.isActive() || !this.client) {
      return;
    }
    try {
      await this.client.set(
        `${QUOTE_PREFIX}${typeId}`,
        JSON.stringify({
          buyPrice: quote.buyPrice,
          sellPrice: quote.sellPrice,
          marketHub: quote.marketHub,
        }),
        'EX',
        MARKET_PRICE_CACHE_TTL_SECONDS,
      );
    } catch (err) {
      this.logger.warn(`Market quote Redis set failed: ${String(err)}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
      this.client = null;
      this.active = false;
    }
  }
}
