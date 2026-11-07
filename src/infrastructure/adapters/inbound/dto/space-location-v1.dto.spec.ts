import { describe, expect, it } from 'vitest';
import { SpaceLocationV1Dto } from './space-location-v1.dto.js';

describe('SpaceLocationV1Dto', () => {
  it('constructs with jsonClass and catalog fields', () => {
    const dto = new SpaceLocationV1Dto({
      locationType: 'STATION',
      locationId: 60006907,
      stationId: 60006907,
      stationName: 'Amarr VIII',
      solarSystemId: 30002187,
      solarSystemName: 'Amarr',
      regionId: 1000043,
      regionName: 'Domain',
    });
    expect(dto).toMatchObject({
      jsonClass: 'SpaceLocationV1Dto',
      locationType: 'STATION',
      locationId: 60006907,
      stationName: 'Amarr VIII',
      solarSystemName: 'Amarr',
      regionName: 'Domain',
    });
  });

  it('defaults locationType to REGION and locationId to 0', () => {
    const dto = new SpaceLocationV1Dto();
    expect(dto.locationType).toBe('REGION');
    expect(dto.locationId).toBe(0);
    expect(dto.jsonClass).toBe('SpaceLocationV1Dto');
  });

  it('serialises as a plain JSON object', () => {
    const wire = JSON.parse(
      JSON.stringify(
        new SpaceLocationV1Dto({
          locationType: 'SOLAR_SYSTEM',
          locationId: 30000142,
          solarSystemId: 30000142,
          solarSystemName: 'Jita',
        }),
      ),
    );
    expect(wire).toMatchObject({
      jsonClass: 'SpaceLocationV1Dto',
      locationType: 'SOLAR_SYSTEM',
      solarSystemName: 'Jita',
    });
  });
});
