import { describe, expect, it, vi } from 'vitest';
import { readPilotBlueprintsFromEsi } from './esi-industry.adapter.js';

describe('readPilotBlueprintsFromEsi', () => {
  it('maps ESI rows into BlueprintV1', async () => {
    const esi = {
      characters: {
        getCharacterBlueprints: vi.fn().mockResolvedValue([
          {
            item_id: 101,
            type_id: 1245,
            location_id: 60006907,
            location_flag: 'Hangar',
            quantity: -2,
            time_efficiency: 0,
            material_efficiency: 10,
            runs: 300,
          },
        ]),
      },
    };
    const list = await readPilotBlueprintsFromEsi(esi, 42);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      jsonClass: 'BlueprintV1',
      blueprintId: 101,
      blueprintTypeId: 1245,
      materialEfficiency: 10,
      timeEfficiency: 0,
      runs: 300,
      blueprintTypeIconURL: 'https://images.evetech.net/types/1245/bp',
    });
  });
});
