import { describe, expect, it } from 'vitest';
import { EveItemV1Dto } from './eve-item-v1.dto.js';
import { Record } from './record.js';

describe('EveItemV1Dto', () => {
  it('extends Record and sets jsonClass', () => {
    const dto = new EveItemV1Dto({
      typeId: 34,
      name: 'Tritanium',
      description: 'Mineral',
      published: true,
      groupId: 18,
    });
    expect(dto).toBeInstanceOf(Record);
    expect(dto).toMatchObject({
      jsonClass: 'EveItemV1Dto',
      typeId: 34,
      name: 'Tritanium',
      published: true,
      groupId: 18,
    });
  });

  it('carries optional ESI fields and expansions', () => {
    const dto = new EveItemV1Dto({
      typeId: 34,
      name: 'Tritanium',
      description: '…',
      published: true,
      groupId: 18,
      iconId: 22,
      iconUrl: 'https://images.evetech.net/types/34/icon',
      groupName: 'Mineral',
      categoryId: 4,
      categoryName: 'Material',
      volume: 0.01,
      dogmaAttributes: [{ attributeId: 1, value: 2 }],
      dogmaEffects: [{ effectId: 3, isDefault: true }],
    });
    expect(dto.groupName).toBe('Mineral');
    expect(dto.categoryName).toBe('Material');
    expect(dto.iconUrl).toBe('https://images.evetech.net/types/34/icon');
    expect(dto.dogmaAttributes).toEqual([{ attributeId: 1, value: 2 }]);
    expect(dto.dogmaEffects).toEqual([{ effectId: 3, isDefault: true }]);
  });

  it('serialises inherited and expansion fields for wire consumers (ITEM-007)', () => {
    const wire = JSON.parse(
      JSON.stringify(
        new EveItemV1Dto({
          typeId: 34,
          name: 'Tritanium',
          description: '…',
          published: true,
          groupId: 18,
          groupName: 'Mineral',
          categoryId: 4,
          categoryName: 'Material',
          iconId: 22,
          iconUrl: 'https://images.evetech.net/types/34/icon',
        }),
      ),
    );
    expect(wire).toMatchObject({
      jsonClass: 'EveItemV1Dto',
      typeId: 34,
      groupName: 'Mineral',
      categoryName: 'Material',
      iconUrl: 'https://images.evetech.net/types/34/icon',
    });
  });
});
