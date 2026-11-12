import { Controller, Get, Param } from '@nestjs/common';
import { GetPilotBlueprintsUseCase } from '@App/use-cases/get-pilot-blueprints.usecase.js';
import type { BlueprintV1Dto } from '@Infra/adapters/inbound/dto/blueprint-v1.dto.js';
import {
  ExceptionCatalog,
  exceptionPayload,
} from '@Infra/adapters/exceptions/index.js';

/**
 * Industry API (`v1`). Pilot blueprints as {@link BlueprintV1Dto}[] (BLP-018…020).
 * OpenAPI: tools/openapi/industry-service-v0.1.0.yaml.
 */
@Controller()
export class V1IndustryController {
  constructor(private readonly getPilotBlueprints: GetPilotBlueprintsUseCase) {}

  @Get('v1/pilots/:pilotId/blueprints')
  async listPilotBlueprints(
    @Param('pilotId') pilotId: string,
  ): Promise<BlueprintV1Dto[]> {
    const id = Number(pilotId);
    if (!Number.isInteger(id)) {
      throw ExceptionCatalog.INVALID_PILOT_ID.doThrow(
        'pilotId',
        exceptionPayload()
          .field('pilotId')
          .container('path')
          .value(String(pilotId))
          .build(),
      );
    }
    return this.getPilotBlueprints.execute(id);
  }
}
