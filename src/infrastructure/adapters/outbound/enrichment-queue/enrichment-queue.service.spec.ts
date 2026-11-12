import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EnrichmentQueueService } from './enrichment-queue.service.js';

describe('EnrichmentQueueService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses in-process async when REDIS_URL is unset', async () => {
    const enrichOne = vi.fn().mockResolvedValue(undefined);
    const store = {
      queryIncompleteOrStale: vi
        .fn()
        .mockResolvedValue([{ nodeId: 'n1' }, { nodeId: 'n2' }]),
    };
    const moduleRef = {
      get: vi.fn().mockReturnValue({ enrichOne }),
    };
    const config = {
      get: vi.fn().mockReturnValue(undefined),
    };

    const service = new EnrichmentQueueService(
      config as never,
      store as never,
      moduleRef as never,
    );
    await service.onModuleInit();
    await service.enqueueScope('scope-a');
    await vi.advanceTimersByTimeAsync(30);

    expect(store.queryIncompleteOrStale).toHaveBeenCalledWith('scope-a');
    expect(enrichOne).toHaveBeenCalledWith('scope-a', 'n1');
    expect(enrichOne).toHaveBeenCalledWith('scope-a', 'n2');

    await service.onModuleDestroy();
  });
});
