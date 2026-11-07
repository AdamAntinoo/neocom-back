import { describe, expect, it } from 'vitest';
import { EveItemV1Dto } from './eve-item-v1.dto.js';
import { EveLocationV1Dto } from './eve-location-v1.dto.js';
import { PricedItemV1Dto } from './priced-item-v1.dto.js';

describe('PricedItemV1Dto', () => {
  const hub = new EveLocationV1Dto({
    locationType: 'STATION',
    locationId: 60003760,
    stationId: 60003760,
    stationName: 'Jita IV - Moon 4 - Caldari Navy Assembly Plant',
    marketHub: true,
  });

  const item = new EveItemV1Dto({
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
  });

  it('extends EveItemV1Dto with hub buy/sell (ITEM-010…012)', () => {
    const priced = PricedItemV1Dto.fromEveItem(item, 5.2, 5.5, hub);
    expect(priced).toBeInstanceOf(EveItemV1Dto);
    expect(priced).toMatchObject({
      jsonClass: 'PricedItemV1Dto',
      typeId: 34,
      name: 'Tritanium',
      groupName: 'Mineral',
      buyPrice: 5.2,
      sellPrice: 5.5,
    });
    expect(priced.marketHub).toBeInstanceOf(EveLocationV1Dto);
    expect(priced.marketHub.locationId).toBe(60003760);
  });

  it('serialises marketHub as a nested JSON object (ITEM-013)', () => {
    const priced = PricedItemV1Dto.fromEveItem(item, 5.2, 5.5, hub);
    const wire = JSON.parse(JSON.stringify(priced)) as Record<string, unknown>;
    expect(wire.jsonClass).toBe('PricedItemV1Dto');
    expect(wire.typeId).toBe(34);
    expect(wire.buyPrice).toBe(5.2);
    expect(wire.sellPrice).toBe(5.5);
    expect(wire.marketHub).toEqual(
      expect.objectContaining({
        jsonClass: 'EveLocationV1Dto',
        locationId: 60003760,
        locationType: 'STATION',
        marketHub: true,
      }),
    );
    expect(typeof wire.marketHub).toBe('object');
    expect(typeof wire.marketHub).not.toBe('number');
  });

  it('rejects a missing marketHub on fromEveItem (ITEM-012)', () => {
    expect(() =>
      PricedItemV1Dto.fromEveItem(item, 1, 2, null as unknown as EveLocationV1Dto),
    ).toThrow(/marketHub/);
  });

  it('rejects a bare location id in place of marketHub object', () => {
    expect(() =>
      PricedItemV1Dto.fromEveItem(item, 1, 2, 60003760 as unknown as EveLocationV1Dto),
    ).toThrow(/marketHub/);
  });

  it('constructs directly with Partial values while keeping PricedItem jsonClass', () => {
    const priced = new PricedItemV1Dto({
      typeId: 34,
      name: 'Tritanium',
      buyPrice: 1,
      sellPrice: 2,
      marketHub: hub,
    });
    expect(priced.jsonClass).toBe('PricedItemV1Dto');
    expect(priced.marketHub.locationId).toBe(60003760);
  });
});
