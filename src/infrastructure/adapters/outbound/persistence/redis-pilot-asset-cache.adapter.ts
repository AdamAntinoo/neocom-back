import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import {
  PILOT_ASSET_CACHE_TTL_SECONDS,
  type PilotAssetCache,
} from '@Domain/ports/pilot-asset-cache.port.js';
import { EveAssetV1Dto } from '@Infra/adapters/inbound/dto/eve-asset-v1.dto.js';
import {
  LocatedAssetContainerV1Dto,
  type PilotAssetNode,
} from '@Infra/adapters/inbound/dto/located-asset-container-v1.dto.js';
import { EveLocationV1Dto } from '@Infra/adapters/inbound/dto/eve-location-v1.dto.js';
import { PricedItemV1Dto } from '@Infra/adapters/inbound/dto/priced-item-v1.dto.js';
import { LayerLogger } from '@Infra/config/layer-logging.js';

/** Key space: pilot/asset (AST-014). */
const KEY_PREFIX = 'neocom:pilot/asset:';
const log = LayerLogger.for('outbound', 'RedisPilotAssetCache');

/**
 * Redis write-through cache for expanded pilot asset lists (TTL 60 minutes).
 * Inactive when REDIS_URL is unset or connect fails.
 */
@Injectable()
export class RedisPilotAssetCache implements PilotAssetCache, OnModuleDestroy {
  private client: Redis | null = null;
  private active = false;

  constructor(config: ConfigService) {
    const redisUrl = config.get<string>('REDIS_URL');
    if (!redisUrl) {
      log.log('REDIS_URL unset — pilot asset cache inactive (ESI-only)');
      return;
    }
    try {
      this.client = new Redis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true });
      void this.connect().catch((err: unknown) => {
        log.warn(`Pilot-asset Redis connect failed: ${String(err)}`);
        this.active = false;
        this.client = null;
      });
    } catch (err) {
      log.warn(`Pilot-asset Redis unavailable: ${String(err)}`);
      this.client = null;
    }
  }

  private async connect(): Promise<void> {
    if (!this.client) {
      return;
    }
    await this.client.connect();
    this.active = true;
    log.log('Pilot-asset Redis cache connected');
  }

  isActive(): boolean {
    return this.active && this.client !== null;
  }

  async get(pilotId: number): Promise<PilotAssetNode[] | undefined> {
    if (!this.isActive() || !this.client) {
      return undefined;
    }
    try {
      const raw = await this.client.get(`${KEY_PREFIX}${pilotId}`);
      if (!raw) {
        return undefined;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return undefined;
      }
      const revived = parsed.map((node) => reviveAssetNode(node));
      log.dtoConverted({
        from: 'Redis JSON',
        to: 'PilotAssetNode',
        count: revived.length,
        ids: revived.map((n) => n.itemId),
        fields: { pilotId, source: 'cache' },
      });
      return revived;
    } catch (err) {
      log.warn(`Pilot-asset Redis get failed: ${String(err)}`);
      return undefined;
    }
  }

  async set(pilotId: number, assets: PilotAssetNode[]): Promise<void> {
    if (!this.isActive() || !this.client) {
      return;
    }
    try {
      await this.client.set(
        `${KEY_PREFIX}${pilotId}`,
        JSON.stringify(assets),
        'EX',
        PILOT_ASSET_CACHE_TTL_SECONDS,
      );
      log.debug('dto.cached', { pilotId, count: assets.length, ttlSeconds: PILOT_ASSET_CACHE_TTL_SECONDS });
    } catch (err) {
      log.warn(`Pilot-asset Redis set failed: ${String(err)}`);
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

function reviveAssetNode(raw: unknown): PilotAssetNode {
  const row = (raw ?? {}) as Partial<LocatedAssetContainerV1Dto> & {
    contents?: unknown[];
    item?: Partial<PricedItemV1Dto>;
    location?: Partial<EveLocationV1Dto>;
  };
  const item = row.item
    ? new PricedItemV1Dto({
        ...row.item,
        marketHub: row.item.marketHub
          ? new EveLocationV1Dto(row.item.marketHub as Partial<EveLocationV1Dto>)
          : new EveLocationV1Dto({}),
      })
    : new PricedItemV1Dto({ marketHub: new EveLocationV1Dto({}) });
  const location = row.location ? new EveLocationV1Dto(row.location) : undefined;
  const base = {
    ...row,
    item,
    ...(location ? { location } : {}),
  };
  if (row.jsonClass === 'LocatedAssetContainerV1Dto' || Array.isArray(row.contents)) {
    return new LocatedAssetContainerV1Dto({
      ...base,
      contents: Array.isArray(row.contents) ? row.contents.map((c) => reviveAssetNode(c)) : [],
    });
  }
  return new EveAssetV1Dto(base);
}
