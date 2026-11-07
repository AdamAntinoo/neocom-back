import { describe, expect, it } from 'vitest';
import { EveLocationV1Dto } from './eve-location-v1.dto.js';
import { SpaceLocationV1Dto } from './space-location-v1.dto.js';

describe('EveLocationV1Dto', () => {
  it('extends SpaceLocationV1Dto and keeps space-location fields', () => {
    const loc = new EveLocationV1Dto({
      locationType: 'STATION',
      locationId: 60003760,
      stationId: 60003760,
      stationName: 'Jita IV - Moon 4',
      marketHub: true,
    });
    expect(loc).toBeInstanceOf(SpaceLocationV1Dto);
    expect(loc).toMatchObject({
      jsonClass: 'EveLocationV1Dto',
      locationType: 'STATION',
      locationId: 60003760,
      stationName: 'Jita IV - Moon 4',
      marketHub: true,
    });
  });

  it('accepts extended location kinds PLANET, SHIP, CARGO_HOLD', () => {
    expect(new EveLocationV1Dto({ locationType: 'PLANET', planetId: 1 }).locationType).toBe(
      'PLANET',
    );
    expect(new EveLocationV1Dto({ locationType: 'SHIP', shipId: 2 }).locationType).toBe('SHIP');
    expect(
      new EveLocationV1Dto({ locationType: 'CARGO_HOLD', cargoHoldId: 'Hangar' }).locationType,
    ).toBe('CARGO_HOLD');
  });

  it('serialises nested parentLocation when present', () => {
    const ship = new EveLocationV1Dto({
      locationType: 'SHIP',
      locationId: 99,
      shipId: 99,
      parentLocation: new EveLocationV1Dto({
        locationType: 'STATION',
        locationId: 60003760,
        stationId: 60003760,
      }),
    });
    const wire = JSON.parse(JSON.stringify(ship)) as {
      parentLocation: { jsonClass: string; locationType: string };
    };
    expect(wire.parentLocation).toMatchObject({
      jsonClass: 'EveLocationV1Dto',
      locationType: 'STATION',
    });
  });
});
