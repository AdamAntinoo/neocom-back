import { describe, expect, it, vi } from 'vitest';
import type { UniverseTypeCache } from '@Domain/ports/universe-type-cache.port.js';
import type { UniverseTypeSource } from '@Domain/ports/universe-type-source.port.js';
import { EveItemV1Dto } from '@Infra/adapters/inbound/dto/eve-item-v1.dto.js';
import { NeocomBackendError } from 'neocom-domain';
import { GetEveItemByIdUseCase } from './get-eve-item-by-id.usecase.js';

describe('GetEveItemByIdUseCase', () => {
  const sample = new EveItemV1Dto({
    typeId: 34,
    name: 'Tritanium',
    published: true,
    groupId: 18,
  });

  it('returns cache hit without calling source (ITEM-018)', async () => {
    const cache: UniverseTypeCache = {
      isActive: () => true,
      get: vi.fn().mockResolvedValue(sample),
      set: vi.fn(),
    };
    const source: UniverseTypeSource = { resolveByTypeId: vi.fn() };
    const uc = new GetEveItemByIdUseCase(cache, source);

    await expect(uc.execute(34)).resolves.toMatchObject({
      typeId: 34,
      name: 'Tritanium',
    });
    expect(source.resolveByTypeId).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('resolves miss then write-through (ITEM-014 / ITEM-018)', async () => {
    const cache: UniverseTypeCache = {
      isActive: () => true,
      get: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue(undefined),
    };
    const source: UniverseTypeSource = {
      resolveByTypeId: vi.fn().mockResolvedValue(sample),
    };
    const uc = new GetEveItemByIdUseCase(cache, source);

    await expect(uc.execute(34)).resolves.toBe(sample);
    expect(source.resolveByTypeId).toHaveBeenCalledWith(34);
    expect(cache.set).toHaveBeenCalledWith(34, sample);
  });

  it('throws EVE_ITEM_NOT_FOUND when source misses', async () => {
    const cache: UniverseTypeCache = {
      isActive: () => true,
      get: vi.fn().mockResolvedValue(undefined),
      set: vi.fn(),
    };
    const source: UniverseTypeSource = {
      resolveByTypeId: vi.fn().mockResolvedValue(undefined),
    };
    const uc = new GetEveItemByIdUseCase(cache, source);

    await expect(uc.execute(999)).rejects.toBeInstanceOf(NeocomBackendError);
    await expect(uc.execute(999)).rejects.toMatchObject({
      errors: [expect.objectContaining({ code: 'EVE_ITEM_NOT_FOUND' })],
    });
  });
});
