import { describe, expect, it } from 'vitest';
import { LOCATION_FIXTURE, type SpaceLocation } from '@Domain/spacelocation/space-location.js';
import { BlueprintListDtoConverter } from './blueprint-list-dto.converter.js';

describe('BlueprintListDtoConverter', () => {
  it('maps ESI library blueprint fields onto BlueprintV1Dto', () => {
    const dto = BlueprintListDtoConverter.toBlueprintV1Dto({
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

    const dto = BlueprintListDtoConverter.toSpaceLocationV1Dto(catalogEntry);

    expect(dto).toMatchObject({
      jsonClass: 'SpaceLocationV1Dto',
      locationId: LOCATION_FIXTURE.stationId,
      stationName: LOCATION_FIXTURE.stationName,
      solarSystemName: LOCATION_FIXTURE.solarSystemName,
      regionName: LOCATION_FIXTURE.regionName,
    });
  });
});
