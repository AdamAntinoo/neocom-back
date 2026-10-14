import { Controller, Get, Headers, HttpStatus, Param } from '@nestjs/common';
import { GetPilotUseCase } from '@App/use-cases/get-pilot.usecase.js';
import type { PilotApi } from '@Infra/api/pilot.api.js';
import { NeocomBackendError } from '@Infra/errors/neocom-backend.error.js';
import type { PilotV1Dto } from '@Generated/pilot/model/pilot-v1-dto.js';

@Controller()
export class V1PilotController implements PilotApi {
  constructor(private readonly getPilotUseCase: GetPilotUseCase) {}

  @Get('v1/pilots/:pilotId')
  public async getPilot(
    @Param('pilotId') pilotId: number,
    @Headers('authorization') authorization?: string,
  ): Promise<PilotV1Dto> {
    const id = Number(pilotId);
    if (!Number.isInteger(id)) {
      throw new NeocomBackendError(HttpStatus.BAD_REQUEST, [
        {
          code: 'INVALID_REQUEST',
          description: 'pilotId must be an integer.',
          field: 'pilotId',
          container: 'path',
          value: String(pilotId),
        },
      ]);
    }
    const loggedIn = typeof authorization === 'string' && authorization.trim().length > 0;
    return this.getPilotUseCase.execute(id, loggedIn);
  }
}
