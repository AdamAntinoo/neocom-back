import { describe, expect, it, beforeEach } from 'vitest';
import { BlueprintListService } from './blueprint-list.service.js';
import { InMemoryProcessedNodeStore } from './in-memory-processed-node.store.js';
import { EnrichmentQueueService } from './enrichment-queue.service.js';
import { SseFanoutService } from './sse-fanout.service.js';
import { ConfigService } from '@nestjs/config';

describe('BlueprintListService', () => {
  let store: InMemoryProcessedNodeStore;
  let service: BlueprintListService;
  let fanout: SseFanoutService;

  beforeEach(() => {
    store = new InMemoryProcessedNodeStore();
    fanout = new SseFanoutService(new ConfigService({}));
    const queue = {
      enqueueScope: async () => undefined,
      enqueueOne: async () => undefined,
    } as unknown as EnrichmentQueueService;
    service = new BlueprintListService(store, fanout, queue);
  });

  it('returns a partial list on persistence miss and stores rows', async () => {
    const list = await service.getList(93813310);
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((b) => b.ready === false)).toBe(true);
    const persisted = await store.listByScope(service.scopeKey(93813310));
    expect(persisted).toHaveLength(list.length);
  });

  it('returns persistence on subsequent requests without requiring ESI', async () => {
    await service.getList(1);
    const again = await service.getList(1);
    expect(again).toHaveLength(2);
  });

  it('enrichOne marks ready and publishes SSE payload', async () => {
    await service.getList(2);
    const scope = service.scopeKey(2);
    let received = false;
    const sub = fanout.stream(scope).subscribe(() => {
      received = true;
    });
    await service.enrichOne(scope, '1001');
    expect(received).toBe(true);
    const rows = await store.listByScope(scope);
    expect(rows.find((r) => r.nodeId === '1001')?.ready).toBe(true);
    sub.unsubscribe();
  });
});
