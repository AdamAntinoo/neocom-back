import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { Queue, Worker, type Job } from 'bullmq';
import { NODE_ENRICHER, type NodeEnricher } from '@Domain/ports/node-enricher.port.js';
import { ProcessedNodeStore } from '@Domain/ports/processed-node.store.js';

type EnrichJob = { scopeKey: string; nodeId: string };

/**
 * BullMQ + Redis when REDIS_URL is set; otherwise in-process async (local/dev) (BASSE-009).
 * Resolves NodeEnricher via ModuleRef after init to avoid a Nest DI cycle with BlueprintListService.
 */
@Injectable()
export class EnrichmentQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EnrichmentQueueService.name);
  private queue: Queue<EnrichJob> | null = null;
  private worker: Worker<EnrichJob> | null = null;
  private enricher: NodeEnricher | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly store: ProcessedNodeStore,
    private readonly moduleRef: ModuleRef,
  ) {}

  async onModuleInit(): Promise<void> {
    this.enricher = this.moduleRef.get<NodeEnricher>(NODE_ENRICHER, { strict: false });

    const redisUrl = this.config.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.log('REDIS_URL unset — enrichment uses in-process async');
      return;
    }
    const connection = { url: redisUrl, maxRetriesPerRequest: null };
    this.queue = new Queue<EnrichJob>('node-enrichment', { connection });
    this.worker = new Worker<EnrichJob>(
      'node-enrichment',
      async (job: Job<EnrichJob>) => {
        await this.enricher!.enrichOne(job.data.scopeKey, job.data.nodeId);
      },
      { connection },
    );
    this.worker.on('failed', (job, err) => {
      this.logger.warn(`Enrichment job ${job?.id} failed: ${err.message}`);
    });
    this.logger.log('BullMQ enrichment worker started');
  }

  async enqueueScope(scopeKey: string): Promise<void> {
    const pending = await this.store.queryIncompleteOrStale(scopeKey);
    for (const item of pending) {
      await this.enqueueOne(scopeKey, item.nodeId);
    }
  }

  async enqueueOne(scopeKey: string, nodeId: string): Promise<void> {
    if (this.queue) {
      await this.queue.add('enrich', { scopeKey, nodeId }, { removeOnComplete: true });
      return;
    }
    setTimeout(() => {
      void this.enricher?.enrichOne(scopeKey, nodeId);
    }, 25);
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }
}
