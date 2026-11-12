import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { NeocomBackendError } from 'neocom-domain';
import { InMemoryProcessedNodeStore } from '@Outbound/persistence/in-memory-processed-node.store.js';
import { EnrichmentQueueService } from '@Outbound/enrichment-queue/enrichment-queue.service.js';
import { SseFanoutService } from '@Outbound/sse-fanout/sse-fanout.service.js';
import { BlueprintListAdapter } from './blueprint-list.adapter.js';

describe('BlueprintListAdapter', () => {
  let store: InMemoryProcessedNodeStore;
  let adapter: BlueprintListAdapter;
  let fanout: SseFanoutService;
  let createClient: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    store = new InMemoryProcessedNodeStore();
    fanout = new SseFanoutService(new ConfigService({}));
    const queue = {
      enqueueScope: async () => undefined,
      enqueueOne: async () => undefined,
    } as unknown as EnrichmentQueueService;
    createClient = vi.fn().mockResolvedValue({
      characters: {
        getCharacterBlueprints: vi.fn().mockResolvedValue([
          {
            item_id: 1001,
            type_id: 1,
            location_id: 1,
            location_flag: 'Hangar',
            quantity: -1,
            time_efficiency: 0,
            material_efficiency: 0,
            runs: 0,
          },
          {
            item_id: 1002,
            type_id: 2,
            location_id: 1,
            location_flag: 'Hangar',
            quantity: -1,
            time_efficiency: 0,
            material_efficiency: 0,
            runs: 0,
          },
        ]),
      },
      shutdown: vi.fn(),
    });
    const tokens = {
      createClient,
      getToken: vi.fn(),
      tokenProviderFor: vi.fn(),
    };
    adapter = new BlueprintListAdapter(store, fanout, queue, tokens as never);
  });

  it('loads partial list from authenticated ESI on persistence miss', async () => {
    const list = await adapter.getList(93813310);
    expect(createClient).toHaveBeenCalledWith(
      93813310,
      expect.objectContaining({ userAgent: expect.any(String) }),
    );
    expect(list).toHaveLength(2);
    expect(list.every((b) => b.ready === false)).toBe(true);
    expect(list[0]?.blueprintId).toBe(1001);
    const persisted = await store.listByScope(adapter.scopeKey(93813310));
    expect(persisted).toHaveLength(2);
  });

  it('returns persistence on subsequent requests without calling ESI again', async () => {
    await adapter.getList(1);
    createClient.mockClear();
    const again = await adapter.getList(1);
    expect(createClient).not.toHaveBeenCalled();
    expect(again).toHaveLength(2);
  });

  it('propagates TOKEN_UNAVAILABLE when createClient fails (no scaffold)', async () => {
    createClient.mockRejectedValue(new Error('no character'));
    try {
      await adapter.getList(42);
      expect.unreachable('should throw');
    } catch (error) {
      expect(error).toBeInstanceOf(NeocomBackendError);
      expect((error as NeocomBackendError).errors[0]?.code).toBe(
        'TOKEN_UNAVAILABLE',
      );
    }
    const persisted = await store.listByScope(adapter.scopeKey(42));
    expect(persisted).toHaveLength(0);
  });

  it('enrichOne marks ready and publishes SSE payload', async () => {
    await adapter.getList(2);
    const scope = adapter.scopeKey(2);
    let received = false;
    const sub = fanout.stream(scope).subscribe(() => {
      received = true;
    });
    await adapter.enrichOne(scope, '1001');
    expect(received).toBe(true);
    const rows = await store.listByScope(scope);
    expect(rows.find((r) => r.nodeId === '1001')?.ready).toBe(true);
    sub.unsubscribe();
  });
});
