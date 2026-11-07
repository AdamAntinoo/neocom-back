import { describe, expect, it } from 'vitest';
import { LOCATION_FIXTURE, type SpaceLocation } from '@Domain/spacelocation/space-location.js';
import { EveItemDtoConverter } from './eve-item-dto.converter.js';

const tritaniumType = {
  type_id: 34,
  name: 'Tritanium',
  description: 'The main building block…',
  published: true,
  group_id: 18,
  icon_id: 22,
  market_group_id: 1857,
  mass: 0,
  volume: 0.01,
  packaged_volume: 0.01,
  portion_size: 1,
  radius: 1,
  capacity: 0,
};

describe('EveItemDtoConverter', () => {
  it('maps ESI library blueprint fields onto BlueprintV1Dto', () => {
    const dto = EveItemDtoConverter.toBlueprintV1Dto({
      item_id: 1009214402302,
      location_flag: 'Hangar',
      location_id: 60006907,
      material_efficiency: 10,
      quantity: -1,
      runs: -1,
      time_efficiency: 20,
      type_id: 31683,
    });
    expect(dto).toMatchObject({
      jsonClass: 'BlueprintV1Dto',
      blueprintId: 1009214402302,
      blueprintTypeId: 31683,
      locationId: 60006907,
      locationFlag: 'Hangar',
      materialEfficiency: 10,
      timeEfficiency: 20,
      runs: -1,
      maxRuns: 0,
    });
  });

  it('maps catalog SpaceLocation to SpaceLocationV1Dto', () => {
    const catalogEntry: SpaceLocation = {
      jsonClass: 'SpaceLocation',
      locationType: 'STATION',
      locationId: LOCATION_FIXTURE.stationId,
      stationId: LOCATION_FIXTURE.stationId,
      stationName: LOCATION_FIXTURE.stationName,
      solarSystemId: LOCATION_FIXTURE.solarSystemId,
      solarSystemName: LOCATION_FIXTURE.solarSystemName,
      regionId: LOCATION_FIXTURE.regionId,
      regionName: LOCATION_FIXTURE.regionName,
      constellationId: LOCATION_FIXTURE.constellationId,
      constellationName: LOCATION_FIXTURE.constellationName,
      securityClass: LOCATION_FIXTURE.securityClass,
      securityStatus: LOCATION_FIXTURE.securityStatus,
    };

    const dto = EveItemDtoConverter.toSpaceLocationV1Dto(catalogEntry);

    expect(dto).toMatchObject({
      jsonClass: 'SpaceLocationV1Dto',
      locationId: LOCATION_FIXTURE.stationId,
      stationName: LOCATION_FIXTURE.stationName,
      solarSystemName: LOCATION_FIXTURE.solarSystemName,
      regionName: LOCATION_FIXTURE.regionName,
    });
  });

  it('maps ESI universe type fields onto EveItemV1Dto (ITEM-001…003)', () => {
    const dto = EveItemDtoConverter.toEveItemV1Dto(tritaniumType);
    expect(dto).toMatchObject({
      jsonClass: 'EveItemV1Dto',
      typeId: 34,
      name: 'Tritanium',
      description: 'The main building block…',
      published: true,
      groupId: 18,
      iconId: 22,
      marketGroupId: 1857,
      mass: 0,
      volume: 0.01,
      packagedVolume: 0.01,
      portionSize: 1,
      radius: 1,
      capacity: 0,
    });
    expect(dto.groupName).toBeUndefined();
    expect(dto.iconUrl).toBeUndefined();
  });

  it('expands group name, category, and iconUrl (ITEM-004…006)', () => {
    const dto = EveItemDtoConverter.fromEsiType(
      tritaniumType,
      { name: 'Mineral', category_id: 4 },
      { name: 'Material' },
    );
    expect(dto).toMatchObject({
      jsonClass: 'EveItemV1Dto',
      typeId: 34,
      groupName: 'Mineral',
      categoryId: 4,
      categoryName: 'Material',
      iconId: 22,
      iconUrl: 'https://images.evetech.net/types/34/icon',
    });
  });

  it('omits iconUrl when ESI type has no icon_id', () => {
    const { icon_id: _omit, ...noIcon } = tritaniumType;
    const dto = EveItemDtoConverter.fromEsiType(noIcon, { name: 'Mineral', category_id: 4 });
    expect(dto.iconId).toBeUndefined();
    expect(dto.iconUrl).toBeUndefined();
  });
});
