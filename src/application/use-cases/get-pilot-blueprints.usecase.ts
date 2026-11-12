import { Inject, Injectable, Optional } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import {
  BLUEPRINT_DTO_LOADER,
  type BlueprintDtoLoader,
} from '@App/ports/blueprint-dto-loader.port.js';
import { GetSpaceLocationUseCase } from '@App/use-cases/get-space-location.usecase.js';
import type { BlueprintV1Dto } from '@Infra/adapters/inbound/dto/blueprint-v1.dto.js';
import { EveItemDtoConverter } from '@Infra/adapters/inbound/converters/eve-item-dto.converter.js';
import {
  NEOCOM_ACCESS,
  parseAccessCookie,
} from '@Infra/adapters/services/auth-cookies.service.js';
import { NeocomBackendError } from 'neocom-domain';

const LOCATION_EMBED_SKIP_CODES = new Set(['LOCATION_NOT_FOUND', 'FORBIDDEN']);

@Injectable()
export class GetPilotBlueprintsUseCase {
  constructor(
    @Inject(BLUEPRINT_DTO_LOADER)
    private readonly blueprints: BlueprintDtoLoader,
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
  private async embedCatalogLocation(
    dto: BlueprintV1Dto,
  ): Promise<BlueprintV1Dto> {
    const auth = this.req
      ? parseAccessCookie(this.req.cookies?.[NEOCOM_ACCESS])
      : null;
    try {
      const location = await this.getSpaceLocation.execute(
        dto.locationId,
        auth,
      );
      dto.location = EveItemDtoConverter.toSpaceLocationV1Dto(location);
    } catch (error) {
      if (
        error instanceof NeocomBackendError &&
        error.errors.some((entry) => LOCATION_EMBED_SKIP_CODES.has(entry.code))
      ) {
        return dto;
      }
      throw error;
    }
    return dto;
  }
}
