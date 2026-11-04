import { HttpStatus, Inject, Injectable, Optional } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import {
  BLUEPRINT_DTO_LOADER,
  type BlueprintDtoLoader,
} from '@App/ports/blueprint-dto-loader.port.js';
import { GetSpaceLocationUseCase } from '@App/use-cases/get-space-location.usecase.js';
import type { BlueprintV1Dto } from '@Infra/adapters/dto/blueprint-v1.dto.js';
import { BlueprintListDtoConverter } from '@Infra/adapters/dto/blueprint-list-dto.converter.js';
import {
  NEOCOM_ACCESS,
  parseAccessCookie,
} from '@Infra/adapters/services/auth-cookies.service.js';
import { NeocomBackendError } from 'neocom-domain';

@Injectable()
export class GetPilotBlueprintsUseCase {
  constructor(
    @Inject(BLUEPRINT_DTO_LOADER) private readonly blueprints: BlueprintDtoLoader,
    private readonly getSpaceLocation: GetSpaceLocationUseCase,
    @Optional() @Inject(REQUEST) private readonly req: Request | null,
  ) {}

  async execute(pilotId: number): Promise<BlueprintV1Dto[]> {
    const dtos = await this.blueprints.loadPilotBlueprintDtos(pilotId);
    return Promise.all(dtos.map((dto) => this.embedCatalogLocation(dto)));
  }

  /**
   * Resolves location via {@link GetSpaceLocationUseCase} (BLP-015 / BLP-030 / LOC-138).
   * Catalog miss or ESI forbidden leaves `location` unset (list continues).
   */
  private async embedCatalogLocation(dto: BlueprintV1Dto): Promise<BlueprintV1Dto> {
    const auth = this.req ? parseAccessCookie(this.req.cookies?.[NEOCOM_ACCESS]) : null;
    try {
      const location = await this.getSpaceLocation.execute(dto.locationId, auth);
      dto.location = BlueprintListDtoConverter.toSpaceLocationV1Dto(location);
    } catch (error) {
      if (
        error instanceof NeocomBackendError &&
        (error.httpStatus === HttpStatus.NOT_FOUND ||
          error.httpStatus === HttpStatus.FORBIDDEN)
      ) {
        return dto;
      }
      throw error;
    }
    return dto;
  }
}
