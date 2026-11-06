import { describe, expect, it, vi } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import type { BlueprintDtoLoader } from '@App/ports/blueprint-dto-loader.port.js';
import { LOCATION_FIXTURE, type SpaceLocation } from '@Domain/spacelocation/space-location.js';
import { BlueprintV1Dto } from '@Infra/adapters/dto/blueprint-v1.dto.js';
import { NeocomBackendError } from 'neocom-domain';
import { GetPilotBlueprintsUseCase } from './get-pilot-blueprints.usecase.js';
import type { GetSpaceLocationUseCase } from './get-space-location.usecase.js';

const fixtureStation: SpaceLocation = {
  jsonClass: 'SpaceLocation',
  locationType: 'STATION',
  locationId: LOCATION_FIXTURE.stationId,
  stationId: LOCATION_FIXTURE.stationId,
  stationName: LOCATION_FIXTURE.stationName,
  solarSystemId: LOCATION_FIXTURE.solarSystemId,
  solarSystemName: LOCATION_FIXTURE.solarSystemName,
  securityClass: LOCATION_FIXTURE.securityClass,
  securityStatus: LOCATION_FIXTURE.securityStatus,
  constellationId: LOCATION_FIXTURE.constellationId,
  constellationName: LOCATION_FIXTURE.constellationName,
  regionId: LOCATION_FIXTURE.regionId,
  regionName: LOCATION_FIXTURE.regionName,
};

describe('GetPilotBlueprintsUseCase', () => {
  it('embeds SpaceLocationV1Dto via GetSpaceLocationUseCase', async () => {
    const sample = new BlueprintV1Dto({
      blueprintId: 1,
      blueprintTypeId: 10,
      locationId: LOCATION_FIXTURE.stationId,
      locationFlag: 'Hangar',
      runs: 5,
      materialEfficiency: 10,
      timeEfficiency: 20,
    });
    const loader: BlueprintDtoLoader = {
      loadPilotBlueprintDtos: vi.fn().mockResolvedValue([sample]),
    };
    const getSpaceLocation = {
      execute: vi.fn().mockResolvedValue(fixtureStation),
    } as unknown as GetSpaceLocationUseCase;
    const useCase = new GetPilotBlueprintsUseCase(loader, getSpaceLocation);

    const result = await useCase.execute(42);

    expect(loader.loadPilotBlueprintDtos).toHaveBeenCalledWith(42);
    expect(getSpaceLocation.execute).toHaveBeenCalledWith(LOCATION_FIXTURE.stationId, null);
    expect(result).toHaveLength(1);
    expect(result[0].jsonClass).toBe('BlueprintV1Dto');
    expect(result[0].locationId).toBe(LOCATION_FIXTURE.stationId);
    expect(result[0].location).toMatchObject({
      jsonClass: 'SpaceLocationV1Dto',
      locationId: LOCATION_FIXTURE.stationId,
      stationName: LOCATION_FIXTURE.stationName,
      solarSystemName: LOCATION_FIXTURE.solarSystemName,
      regionName: LOCATION_FIXTURE.regionName,
    });
  });

  it('leaves location unset when space-location use case returns NOT_FOUND', async () => {
    const sample = new BlueprintV1Dto({
      blueprintId: 2,
      blueprintTypeId: 10,
      locationId: 60006907,
      locationFlag: 'Hangar',
    });
    const loader: BlueprintDtoLoader = {
      loadPilotBlueprintDtos: vi.fn().mockResolvedValue([sample]),
    };
    const getSpaceLocation = {
      execute: vi.fn().mockRejectedValue(
        new NeocomBackendError(HttpStatus.NOT_FOUND, [
          {
            code: 'LOCATION_NOT_FOUND',
            description: 'missing',
            field: 'locationId',
            container: 'path',
            value: '60006907',
          },
        ]),
      ),
    } as unknown as GetSpaceLocationUseCase;
    const useCase = new GetPilotBlueprintsUseCase(loader, getSpaceLocation);

    const result = await useCase.execute(7);

    expect(getSpaceLocation.execute).toHaveBeenCalledWith(60006907, null);
    expect(result[0].location).toBeUndefined();
    expect(result[0].locationId).toBe(60006907);
  });

  it('leaves location unset when space-location use case returns FORBIDDEN', async () => {
    const sample = new BlueprintV1Dto({
      blueprintId: 3,
      blueprintTypeId: 10,
      locationId: 1_000_000_000_035,
      locationFlag: 'Hangar',
    });
    const loader: BlueprintDtoLoader = {
      loadPilotBlueprintDtos: vi.fn().mockResolvedValue([sample]),
    };
    const getSpaceLocation = {
      execute: vi.fn().mockRejectedValue(
        new NeocomBackendError(HttpStatus.FORBIDDEN, [
          {
            code: 'FORBIDDEN',
            description: 'ESI forbids access to location id 1000000000035.',
            field: 'locationId',
            container: 'path',
            value: '1000000000035',
          },
        ]),
      ),
    } as unknown as GetSpaceLocationUseCase;
    const useCase = new GetPilotBlueprintsUseCase(loader, getSpaceLocation);

    const result = await useCase.execute(7);

    expect(result[0].location).toBeUndefined();
    expect(result[0].locationId).toBe(1_000_000_000_035);
  });
});
