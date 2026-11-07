import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { LocationCache } from '@Domain/ports/location-cache.port.js';
import type { SpaceLocation } from '@Domain/spacelocation/space-location.js';

const KEY_PREFIX = 'neocom:location:';

/**
 * Redis-backed location cache (LOC-140). Inactive when REDIS_URL is unset or connect fails (LOC-134).
 */
@Injectable()
export class RedisLocationCache implements LocationCache, OnModuleDestroy {
  private readonly logger = new Logger(RedisLocationCache.name);
  private client: Redis | null = null;
  private active = false;

  constructor(config: ConfigService) {
    const redisUrl = config.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.log('REDIS_URL unset — location cache inactive (ESI-only resolve)');
      return;
    }
    try {
      this.client = new Redis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true });
      void this.connect().catch((err: unknown) => {
        this.logger.warn(`Location Redis connect failed: ${String(err)}`);
        this.active = false;
        this.client = null;
      });
    } catch (err) {
      this.logger.warn(`Location Redis unavailable: ${String(err)}`);
      this.client = null;
    }
  }

  private async connect(): Promise<void> {
    if (!this.client) {
      return;
    }
    await this.client.connect();
    this.active = true;
    this.logger.log('Location Redis cache connected');
  }

  isActive(): boolean {
    return this.active && this.client !== null;
  }

  async get(locationId: number): Promise<SpaceLocation | undefined> {
    if (!this.isActive() || !this.client) {
      return undefined;
    }
    try {
      const raw = await this.client.get(`${KEY_PREFIX}${locationId}`);
      if (!raw) {
        return undefined;
      }
      return JSON.parse(raw) as SpaceLocation;
    } catch (err) {
      this.logger.warn(`Location Redis get failed: ${String(err)}`);
      return undefined;
    }
  }

  async set(locationId: number, location: SpaceLocation): Promise<void> {
    if (!this.isActive() || !this.client) {
      return;
    }
    try {
      await this.client.set(`${KEY_PREFIX}${locationId}`, JSON.stringify(location));
    } catch (err) {
      this.logger.warn(`Location Redis set failed: ${String(err)}`);
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
