import { describe, expect, it } from 'vitest';
import { EveAssetV1Dto } from './eve-asset-v1.dto.js';
import { EveLocationV1Dto } from './eve-location-v1.dto.js';
import { PricedItemV1Dto } from './priced-item-v1.dto.js';
import { Record } from './record.js';

describe('EveAssetV1Dto', () => {
  it('extends Record and sets jsonClass with instance fields', () => {
    const item = new PricedItemV1Dto({
      typeId: 34,
      name: 'Tritanium',
      buyPrice: 1,
      sellPrice: 2,
      marketHub: new EveLocationV1Dto({ locationId: 60003760 }),
    });
    const dto = new EveAssetV1Dto({
      itemId: 1,
      typeId: 34,
      quantity: 100,
      locationId: 60003760,
      locationType: 'station',
      locationFlag: 'Hangar',
      isSingleton: false,
      ownerPilotId: 42,
      item,
      location: new EveLocationV1Dto({
        locationId: 60003760,
        locationType: 'STATION',
      }),
    });
    expect(dto).toBeInstanceOf(Record);
    expect(dto.jsonClass).toBe('EveAssetV1Dto');
    expect(dto.item).toBe(item);
    expect(dto.location?.locationId).toBe(60003760);
  });

  it('keeps optional isBlueprintCopy and name', () => {
    const dto = new EveAssetV1Dto({
      itemId: 2,
      typeId: 21964,
      isBlueprintCopy: true,
      name: 'Prisas',
      item: new PricedItemV1Dto({
        typeId: 21964,
        marketHub: new EveLocationV1Dto({ locationId: 60003760 }),
      }),
    });
    expect(dto.isBlueprintCopy).toBe(true);
    expect(dto.name).toBe('Prisas');
  });
});
