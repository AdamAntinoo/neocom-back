import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import Redis from 'ioredis';

export type NodeUpdatedEvent = {
  scopeKey: string;
  nodeId: string;
  node: Record<string, unknown>;
};

export type SseMessage = {
  type?: string;
  data: string;
};

/**
 * Local Subject plus optional Redis pub/sub for multi-replica SSE fan-out (BASSE-010).
 */
@Injectable()
export class SseFanoutService implements OnModuleDestroy {
  private readonly logger = new Logger(SseFanoutService.name);
  private readonly local$ = new Subject<NodeUpdatedEvent>();
  private readonly prefix: string;
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;

  constructor(private readonly config: ConfigService) {
    this.prefix = this.config.get<string>('ASYNC_SSE_CHANNEL_PREFIX') ?? 'neocom:sse:';
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (redisUrl) {
      try {
        this.publisher = new Redis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true });
        this.subscriber = new Redis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true });
        void this.connectRedis().catch((err: unknown) => {
          this.logger.warn(`Redis SSE fan-out connect failed: ${String(err)}`);
          this.publisher = null;
          this.subscriber = null;
        });
      } catch (err) {
        this.logger.warn(`Redis SSE fan-out unavailable: ${String(err)}`);
      }
    }
  }

  private async connectRedis(): Promise<void> {
    if (!this.publisher || !this.subscriber) {
      return;
    }
    await this.publisher.connect();
    await this.subscriber.connect();
    const pattern = `${this.prefix}*`;
    await this.subscriber.psubscribe(pattern);
    this.subscriber.on('pmessage', (_pattern, channel, message) => {
      const scopeKey = channel.slice(this.prefix.length);
      try {
        const payload = JSON.parse(message) as Omit<NodeUpdatedEvent, 'scopeKey'>;
        this.local$.next({ scopeKey, ...payload });
      } catch {
        this.logger.warn(`Invalid SSE fan-out payload on ${channel}`);
      }
    });
    this.logger.log(`SSE Redis fan-out subscribed to ${pattern}`);
  }

  async publish(event: NodeUpdatedEvent): Promise<void> {
    this.local$.next(event);
    if (this.publisher) {
      try {
        await this.publisher.publish(
          `${this.prefix}${event.scopeKey}`,
          JSON.stringify({ nodeId: event.nodeId, node: event.node }),
        );
      } catch (err) {
        this.logger.warn(`SSE publish failed: ${String(err)}`);
      }
    }
  }

  stream(scopeKey: string): Observable<SseMessage> {
    return this.local$.pipe(
      filter((e) => e.scopeKey === scopeKey),
      map((e) => ({
        type: 'node-updated',
        data: JSON.stringify({ nodeId: e.nodeId, node: e.node }),
      })),
    );
  }

  async onModuleDestroy(): Promise<void> {
    this.local$.complete();
    try {
      await this.subscriber?.quit();
      await this.publisher?.quit();
    } catch {
      /* ignore shutdown errors */
    }
  }
}
