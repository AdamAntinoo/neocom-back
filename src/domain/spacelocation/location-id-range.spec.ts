import { describe, expect, it } from 'vitest';
import {
  classifyLocationId,
  requiresAuthenticatedEsi,
} from './location-id-range.js';
import { LOCATION_FIXTURE } from './space-location.js';

describe('classifyLocationId', () => {
  it('maps LocationFactory ranges', () => {
    expect(classifyLocationId(LOCATION_FIXTURE.regionId)).toBe('REGION');
    expect(classifyLocationId(LOCATION_FIXTURE.constellationId)).toBe(
      'CONSTELLATION',
    );
    expect(classifyLocationId(LOCATION_FIXTURE.solarSystemId)).toBe(
      'SOLAR_SYSTEM',
    );
    expect(classifyLocationId(LOCATION_FIXTURE.stationId)).toBe('STATION');
    expect(classifyLocationId(1_000_000_000_001)).toBe('STRUCTURE');
  });

  it('requires auth only for structures', () => {
    expect(requiresAuthenticatedEsi(LOCATION_FIXTURE.stationId)).toBe(false);
    expect(requiresAuthenticatedEsi(1_000_000_000_001)).toBe(true);
  });
});
