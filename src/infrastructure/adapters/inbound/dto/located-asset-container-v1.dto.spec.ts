import { describe, expect, it } from 'vitest';
import { EveAssetV1Dto } from './eve-asset-v1.dto.js';
import { LocatedAssetContainerV1Dto } from './located-asset-container-v1.dto.js';
import { EveLocationV1Dto } from './eve-location-v1.dto.js';
import { PricedItemV1Dto } from './priced-item-v1.dto.js';

function priced(typeId: number): PricedItemV1Dto {
  return new PricedItemV1Dto({
    typeId,
    marketHub: new EveLocationV1Dto({ locationId: 60003760 }),
  });
}

describe('LocatedAssetContainerV1Dto', () => {
  it('is an EveAsset with contents array of nested objects', () => {
    const child = new EveAssetV1Dto({
      itemId: 2,
      typeId: 38,
      locationId: 1,
      locationType: 'item',
      item: priced(38),
    });
    const container = new LocatedAssetContainerV1Dto({
      itemId: 1,
      typeId: 620,
      locationId: 60003760,
      locationType: 'station',
      item: priced(620),
      contents: [child],
    });
    expect(container).toBeInstanceOf(EveAssetV1Dto);
    expect(container.jsonClass).toBe('LocatedAssetContainerV1Dto');
    expect(container.contents).toHaveLength(1);
    expect(container.contents[0].itemId).toBe(2);
  });
});
