import { describe, expect, it, vi } from 'vitest';
import { readPilotAssetsFromEsi } from './esi-pilot-assets.adapter.js';

describe('readPilotAssetsFromEsi', () => {
  it('maps ESI rows and joins names by item_id (omits literal None)', async () => {
    const esi = {
      assets: {
        getCharacterAssets: vi.fn().mockResolvedValue([
          {
            item_id: 1,
            type_id: 34,
            quantity: 10,
            location_id: 60003760,
            location_type: 'station',
            location_flag: 'Hangar',
            is_singleton: false,
          },
          {
            item_id: 2,
            type_id: 38,
            quantity: 1,
            location_id: 60003760,
            location_type: 'station',
            location_flag: 'Hangar',
            is_singleton: true,
            is_blueprint_copy: true,
          },
        ]),
        postCharacterAssetNames: vi.fn().mockResolvedValue([
          { item_id: 1, name: 'None' },
          { item_id: 2, name: 'Prisas' },
        ]),
      },
    };

    const rows = await readPilotAssetsFromEsi(esi, 42);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBeUndefined();
    expect(rows[1]).toMatchObject({
      itemId: 2,
      name: 'Prisas',
      isBlueprintCopy: true,
      ownerPilotId: 42,
    });
    expect(esi.assets.postCharacterAssetNames).toHaveBeenCalledWith(42, [1, 2]);
  });
});
