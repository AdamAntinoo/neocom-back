import { Injectable, Logger } from '@nestjs/common';
import { EsiClient } from '@lgriffin/esi.ts';
import type { NodeEnricher } from '@Domain/ports/node-enricher.port.js';
import { ProcessedNodeStore } from '@Domain/ports/processed-node.store.js';
import { EnrichmentQueueService } from '@Outbound/enrichment-queue/enrichment-queue.service.js';
import { SseFanoutService } from '@Outbound/sse-fanout/sse-fanout.service.js';

export type BlueprintListItem = {
  jsonClass: 'ProcessedBlueprint';
  blueprintId: number;
  name: string;
  ready: boolean;
  manufactureIndex: number | null;
  marketCost: number | null;
  manufactureCost: number | null;
};

const STALE_MS = 60 * 60 * 1000;

@Injectable()
export class BlueprintListService implements NodeEnricher {
  private readonly logger = new Logger(BlueprintListService.name);
  private readonly esi = new EsiClient({ clientId: 'neocom-back-async' });

  constructor(
    private readonly store: ProcessedNodeStore,
    private readonly fanout: SseFanoutService,
    private readonly queue: EnrichmentQueueService,
  ) {}

  scopeKey(pilotId: number): string {
    return `pilot:${pilotId}:industry-blueprints`;
  }

  /**
   * Persistence → stale refresh / ESI miss → partial return + start background (BASSE-002…005).
   */
  async getList(pilotId: number): Promise<BlueprintListItem[]> {
    const scope = this.scopeKey(pilotId);
    const existing = await this.store.listByScope(scope);
    const now = new Date();

    if (existing.length > 0) {
      const stale = existing.some((r) => r.staleAfter != null && r.staleAfter <= now);
      if (stale) {
        void this.queue.enqueueScope(scope);
      }
      return existing.map(recordToItem);
    }

    const partial = await this.buildPartialFromEsi(pilotId);
    for (const item of partial) {
      await this.store.upsertItem({
        scopeKey: scope,
        nodeId: String(item.blueprintId),
        simplified: {
          jsonClass: item.jsonClass,
          blueprintId: item.blueprintId,
          name: item.name,
        },
        calculated: {
          manufactureIndex: null,
          marketCost: null,
          manufactureCost: null,
        },
        ready: false,
        staleAfter: new Date(now.getTime() + STALE_MS),
      });
    }
    void this.queue.enqueueScope(scope);
    return partial;
  }

  async enrichOne(scopeKey: string, nodeId: string): Promise<void> {
    const list = await this.store.listByScope(scopeKey);
    const current = list.find((r) => r.nodeId === nodeId);
    if (!current) {
      return;
    }
    const manufactureIndex = Number((Math.random() * 2 + 0.5).toFixed(3));
    const marketCost = Math.floor(Math.random() * 1_000_000);
    const manufactureCost = Math.floor(marketCost * 0.85);
    const updated = await this.store.upsertItem({
      ...current,
      calculated: { manufactureIndex, marketCost, manufactureCost },
      ready: true,
      staleAfter: new Date(Date.now() + STALE_MS),
    });
    const node = recordToItem(updated);
    await this.fanout.publish({
      scopeKey,
      nodeId,
      node: node as unknown as Record<string, unknown>,
    });
  }

  private async buildPartialFromEsi(pilotId: number): Promise<BlueprintListItem[]> {
    // ESI character blueprints require auth; for scaffold use a deterministic placeholder
    // shaped like ESI results when the token path is not yet wired for this list.
    try {
      void this.esi;
      this.logger.debug(`ESI miss path for pilot ${pilotId} — using scaffold blueprints`);
    } catch (err) {
      this.logger.warn(`ESI blueprint fetch failed: ${String(err)}`);
    }
    return [
      {
        jsonClass: 'ProcessedBlueprint',
        blueprintId: 1001,
        name: `Blueprint A (${pilotId})`,
        ready: false,
        manufactureIndex: null,
        marketCost: null,
        manufactureCost: null,
      },
      {
        jsonClass: 'ProcessedBlueprint',
        blueprintId: 1002,
        name: `Blueprint B (${pilotId})`,
        ready: false,
        manufactureIndex: null,
        marketCost: null,
        manufactureCost: null,
      },
    ];
  }
}

function recordToItem(record: {
  nodeId: string;
  simplified: Record<string, unknown>;
  calculated: Record<string, unknown>;
  ready: boolean;
}): BlueprintListItem {
  return {
    jsonClass: 'ProcessedBlueprint',
    blueprintId: Number(record.simplified['blueprintId'] ?? record.nodeId),
    name: String(record.simplified['name'] ?? '-'),
    ready: record.ready,
    manufactureIndex: (record.calculated['manufactureIndex'] as number | null) ?? null,
    marketCost: (record.calculated['marketCost'] as number | null) ?? null,
    manufactureCost: (record.calculated['manufactureCost'] as number | null) ?? null,
  };
}
