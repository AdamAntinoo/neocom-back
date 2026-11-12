import { describe, expect, it } from 'vitest';
import { BlueprintV1Dto } from './blueprint-v1.dto.js';
import { SpaceLocationV1Dto } from './space-location-v1.dto.js';

describe('BlueprintV1Dto', () => {
  it('constructs with jsonClass and assigned fields', () => {
    const dto = new BlueprintV1Dto({
      blueprintId: 1009214402302,
      blueprintTypeId: 31683,
      blueprintTypeName: 'Gila Blueprint',
      outputTypeId: 17715,
      outputTypeName: 'Gila',
      runs: -1,
      materialEfficiency: 10,
      timeEfficiency: 20,
      locationId: 60006907,
      locationFlag: 'Hangar',
    });
    expect(dto).toMatchObject({
      jsonClass: 'BlueprintV1Dto',
      blueprintId: 1009214402302,
      blueprintTypeId: 31683,
      outputTypeId: 17715,
      materialEfficiency: 10,
      timeEfficiency: 20,
      locationFlag: 'Hangar',
    });
  });

  it('clamps materialEfficiency to 0–10 and timeEfficiency to 0–20', () => {
    expect(
      new BlueprintV1Dto({ materialEfficiency: 99 }).materialEfficiency,
    ).toBe(10);
    expect(
      new BlueprintV1Dto({ materialEfficiency: -5 }).materialEfficiency,
    ).toBe(0);
    expect(new BlueprintV1Dto({ timeEfficiency: 99 }).timeEfficiency).toBe(20);
    expect(new BlueprintV1Dto({ timeEfficiency: -1 }).timeEfficiency).toBe(0);
    expect(
      new BlueprintV1Dto({ materialEfficiency: Number.NaN }).materialEfficiency,
    ).toBe(0);
  });

  it('derives Image Server icon URLs when type ids are set and URLs are empty', () => {
    const dto = new BlueprintV1Dto({
      blueprintTypeId: 31683,
      outputTypeId: 17715,
    });
    expect(dto.blueprintTypeIconURL).toBe(
      'https://images.evetech.net/types/31683/bp',
    );
    expect(dto.outputTypeIconURL).toBe(
      'https://images.evetech.net/types/17715/icon',
    );
  });

  it('keeps explicit icon URLs when provided', () => {
    const dto = new BlueprintV1Dto({
      blueprintTypeId: 31683,
      outputTypeId: 17715,
      blueprintTypeIconURL: 'https://example.test/bp.png',
      outputTypeIconURL: 'https://example.test/out.png',
    });
    expect(dto.blueprintTypeIconURL).toBe('https://example.test/bp.png');
    expect(dto.outputTypeIconURL).toBe('https://example.test/out.png');
  });

  it('embeds optional catalog location', () => {
    const location = new SpaceLocationV1Dto({
      locationType: 'STATION',
      locationId: 60006907,
      stationName: 'Amarr VIII',
    });
    const dto = new BlueprintV1Dto({ locationId: 60006907, location });
    expect(dto.location).toBeInstanceOf(SpaceLocationV1Dto);
    expect(dto.location?.stationName).toBe('Amarr VIII');
  });
});
