import { Inject, Injectable, Logger } from '@nestjs/common';
import { EsiClient, EsiTokenManager } from '@lgriffin/esi.ts';
import type { NodeEnricher } from '@Domain/ports/node-enricher.port.js';
import { ProcessedNodeStore } from '@Domain/ports/processed-node.store.js';
import { ExceptionCatalog } from '@Infra/adapters/exceptions/index.js';
import { ESI_TOKEN_MANAGER } from '@Infra/auth/esi-token-manager.provider.js';
import { EnrichmentQueueService } from '@Outbound/enrichment-queue/enrichment-queue.service.js';
import { SseFanoutService } from '@Outbound/sse-fanout/sse-fanout.service.js';
import { readPilotBlueprintDtosFromEsi } from '@Outbound/industry/esi-industry.adapter.js';

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
const ESI_USER_AGENT =
  'neocom-back/0.1.0 (AdamAntinoo; https://github.com/AdamAntinoo/neocom-back)';

@Injectable()
export class BlueprintListService implements NodeEnricher {
  private readonly logger = new Logger(BlueprintListService.name);

  constructor(
    private readonly store: ProcessedNodeStore,
    private readonly fanout: SseFanoutService,
    private readonly queue: EnrichmentQueueService,
    @Inject(ESI_TOKEN_MANAGER) private readonly tokens: EsiTokenManager,
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
    if (partial.length > 0) {
      void this.queue.enqueueScope(scope);
    }
    return partial;
  }

  async enrichOne(scopeKey: string, nodeId: string): Promise<void> {
    const list = await this.store.listByScope(scopeKey);
    const current = list.find((r) => r.nodeId === nodeId);
    if (!current) {
      return;
    }
    // Calculated enrichment is still local (BASSE-004); values are deterministic from node id
    // until a real cost index service exists — not scaffold ESI rows.
    const seed = Number(nodeId) || 0;
    const manufactureIndex = Number(((seed % 150) / 100 + 0.5).toFixed(3));
    const marketCost = 10_000 + (seed % 90_000);
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

  /**
   * Persistence miss: authenticated ESI character blueprints (BASSE-011).
   * No scaffold fallback — token/ESI failures propagate as NeocomBackendError.
   */
  private async buildPartialFromEsi(pilotId: number): Promise<BlueprintListItem[]> {
    let client: EsiClient;
    try {
      client = await this.tokens.createClient(pilotId, { userAgent: ESI_USER_AGENT });
    } catch {
      throw ExceptionCatalog.TOKEN_UNAVAILABLE.doThrow();
    }

    try {
      const dtos = await readPilotBlueprintDtosFromEsi(client, pilotId);
      this.logger.debug(`ESI miss path for pilot ${pilotId} — ${dtos.length} blueprints from ESI`);
      return dtos.map((bp) => ({
        jsonClass: 'ProcessedBlueprint' as const,
        blueprintId: bp.blueprintId,
        name: bp.blueprintTypeName || `Blueprint ${bp.blueprintId}`,
        ready: false,
        manufactureIndex: null,
        marketCost: null,
        manufactureCost: null,
      }));
    } finally {
      client.shutdown();
    }
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
