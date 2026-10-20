import { Controller, Get, Headers, Param } from '@nestjs/common';
import type { PilotV2, PublicPilotV1 } from 'neocom-domain';
import { GetPilotUseCase } from '@App/use-cases/get-pilot.usecase.js';
import type { PilotApi } from '@Infra/adapters/api/pilot.api.js';
import {
  ExceptionCatalog,
  exceptionPayload,
} from '@Infra/adapters/exceptions/index.js';

@Controller()
export class V1PilotController implements PilotApi {
  constructor(private readonly getPilotUseCase: GetPilotUseCase) {}

  @Get('v1/pilots/:pilotId')
  public async getPilot(
    @Param('pilotId') pilotId: number,
    @Headers('authorization') authorization?: string,
  ): Promise<PublicPilotV1 | PilotV2> {
    const id = Number(pilotId);
    if (!Number.isInteger(id)) {
      throw ExceptionCatalog.INVALID_PILOT_ID.doThrow(
        'pilotId',
        exceptionPayload().field('pilotId').container('path').value(String(pilotId)).build(),
      );
    }
    const loggedIn = typeof authorization === 'string' && authorization.trim().length > 0;
    return this.getPilotUseCase.execute(id, loggedIn);
  }
}
