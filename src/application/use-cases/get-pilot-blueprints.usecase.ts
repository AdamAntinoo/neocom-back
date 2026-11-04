import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  BLUEPRINT_DTO_LOADER,
  type BlueprintDtoLoader,
} from '@App/ports/blueprint-dto-loader.port.js';
import { GetSpaceLocationUseCase } from '@App/use-cases/get-space-location.usecase.js';
import type { BlueprintV1Dto } from '@Infra/adapters/dto/blueprint-v1.dto.js';
import { BlueprintListDtoConverter } from '@Infra/adapters/dto/blueprint-list-dto.converter.js';
import { NeocomBackendError } from 'neocom-domain';

@Injectable()
export class GetPilotBlueprintsUseCase {
  constructor(
    @Inject(BLUEPRINT_DTO_LOADER) private readonly blueprints: BlueprintDtoLoader,
    private readonly getSpaceLocation: GetSpaceLocationUseCase,
  ) {}

  async execute(pilotId: number): Promise<BlueprintV1Dto[]> {
    const dtos = await this.blueprints.loadPilotBlueprintDtos(pilotId);
    return Promise.all(dtos.map((dto) => this.embedCatalogLocation(dto)));
  }

  /**
   * Resolves location via {@link GetSpaceLocationUseCase} (BLP-015 / BLP-030).
   * Catalog miss leaves `location` unset (behaviour not specified as fail-hard for list).
   */
  private async embedCatalogLocation(dto: BlueprintV1Dto): Promise<BlueprintV1Dto> {
    try {
      const location = await this.getSpaceLocation.execute(dto.locationId);
      dto.location = BlueprintListDtoConverter.toSpaceLocationV1Dto(location);
    } catch (error) {
      if (
        error instanceof NeocomBackendError &&
        error.httpStatus === HttpStatus.NOT_FOUND
      ) {
        return dto;
      }
      throw error;
    }
    return dto;
  }
}
