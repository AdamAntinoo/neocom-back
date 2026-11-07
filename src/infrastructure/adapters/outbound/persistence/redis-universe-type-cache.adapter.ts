import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { UniverseTypeCache } from '@Domain/ports/universe-type-cache.port.js';
import { EveItemV1Dto } from '@Infra/adapters/inbound/dto/eve-item-v1.dto.js';
import { LayerLogger } from '@Infra/config/layer-logging.js';

const KEY_PREFIX = 'neocom:universe-type:';
const log = LayerLogger.for('outbound', 'RedisUniverseTypeCache');

/**
 * Permanent Redis universe-type cache (ITEM-018). Stores {@link EveItemV1Dto}.
 * Inactive when REDIS_URL is unset or connect fails.
 */
@Injectable()
export class RedisUniverseTypeCache implements UniverseTypeCache, OnModuleDestroy {
  private client: Redis | null = null;
  private active = false;

  constructor(config: ConfigService) {
    const redisUrl = config.get<string>('REDIS_URL');
    if (!redisUrl) {
      log.log('REDIS_URL unset — universe-type cache inactive (ESI-only resolve)');
      return;
    }
    try {
      this.client = new Redis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true });
      void this.connect().catch((err: unknown) => {
        log.warn(`Universe-type Redis connect failed: ${String(err)}`);
        this.active = false;
        this.client = null;
      });
    } catch (err) {
      log.warn(`Universe-type Redis unavailable: ${String(err)}`);
      this.client = null;
    }
  }

  private async connect(): Promise<void> {
    if (!this.client) {
      return;
    }
    await this.client.connect();
    this.active = true;
    log.log('Universe-type Redis cache connected');
  }

  isActive(): boolean {
    return this.active && this.client !== null;
  }

  async get(typeId: number): Promise<EveItemV1Dto | undefined> {
    if (!this.isActive() || !this.client) {
      return undefined;
    }
    try {
      const raw = await this.client.get(`${KEY_PREFIX}${typeId}`);
      if (!raw) {
        return undefined;
      }
      const dto = new EveItemV1Dto(JSON.parse(raw) as Partial<EveItemV1Dto>);
      log.dtoConverted({
        from: 'Redis JSON',
        to: 'EveItemV1Dto',
        ids: [dto.typeId],
        fields: { source: 'cache', name: dto.name },
      });
      return dto;
    } catch (err) {
      log.warn(`Universe-type Redis get failed: ${String(err)}`);
      return undefined;
    }
  }

  async set(typeId: number, item: EveItemV1Dto): Promise<void> {
    if (!this.isActive() || !this.client) {
      return;
    }
    try {
      // Permanent — no EX/TTL (ITEM-018).
      await this.client.set(`${KEY_PREFIX}${typeId}`, JSON.stringify(item));
      log.debug('dto.cached', { typeId, permanent: true });
    } catch (err) {
      log.warn(`Universe-type Redis set failed: ${String(err)}`);
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
