import { beforeEach, describe, expect, it, vi } from 'vitest';

const getTypeById = vi.fn();
const getItemGroupById = vi.fn();
const getItemCategoryById = vi.fn();

vi.mock('@lgriffin/esi.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lgriffin/esi.ts')>();
  return {
    ...actual,
    EsiClient: vi.fn(function EsiClient() {
      return {
        universe: {
          getTypeById,
          getItemGroupById,
          getItemCategoryById,
        },
      };
    }),
  };
});

import { EsiUniverseTypeSource } from './esi-universe-type-source.adapter.js';

describe('EsiUniverseTypeSource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves a type with group and category expansion', async () => {
    getTypeById.mockResolvedValue({
      type_id: 34,
      name: 'Tritanium',
      group_id: 18,
      published: true,
    });
    getItemGroupById.mockResolvedValue({
      group_id: 18,
      name: 'Mineral',
      category_id: 4,
    });
    getItemCategoryById.mockResolvedValue({
      category_id: 4,
      name: 'Material',
    });

    const source = new EsiUniverseTypeSource();
    const dto = await source.resolveByTypeId(34);

    expect(dto?.typeId).toBe(34);
    expect(dto?.name).toBe('Tritanium');
    expect(dto?.groupId).toBe(18);
    expect(getTypeById).toHaveBeenCalledWith(34);
    expect(getItemGroupById).toHaveBeenCalledWith(18);
    expect(getItemCategoryById).toHaveBeenCalledWith(4);
  });

  it('returns a type when group expansion fails', async () => {
    getTypeById.mockResolvedValue({
      type_id: 34,
      name: 'Tritanium',
      group_id: 18,
      published: true,
    });
    getItemGroupById.mockRejectedValue(new Error('group down'));

    const source = new EsiUniverseTypeSource();
    const dto = await source.resolveByTypeId(34);
    expect(dto?.typeId).toBe(34);
    expect(getItemCategoryById).not.toHaveBeenCalled();
  });

  it('returns undefined on ESI not-found', async () => {
    const { EsiError } = await import('@lgriffin/esi.ts');
    getTypeById.mockRejectedValue(new EsiError(404, 'missing'));

    const source = new EsiUniverseTypeSource();
    expect(await source.resolveByTypeId(1)).toBeUndefined();
  });

  it('rethrows unexpected ESI errors', async () => {
    getTypeById.mockRejectedValue(new Error('boom'));
    const source = new EsiUniverseTypeSource();
    await expect(source.resolveByTypeId(1)).rejects.toThrow('boom');
  });
});
