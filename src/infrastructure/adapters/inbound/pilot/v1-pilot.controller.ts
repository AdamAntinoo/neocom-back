import { BadRequestException, Controller, Get, Headers, Param } from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { GetPilotUseCase } from '../../../../application/use-cases/get-pilot.usecase.js';
import { Configuration } from '../../../generated/pilot/configuration.js';
import type { DefaultServiceInterface } from '../../../generated/pilot/api/default.serviceInterface.js';
import type { PilotDto } from '../../../generated/pilot/model/pilot-dto.js';

@Controller()
export class V1PilotController implements DefaultServiceInterface {
  defaultHeaders = {};
  configuration = new Configuration();

  constructor(private readonly getPilotUseCase: GetPilotUseCase) {}

  @Get('pilots/:pilotId')
  getPilot(
    @Param('pilotId') pilotId: number,
    @Headers('authorization') authorization?: string,
  ): Observable<PilotDto> {
    const id = Number(pilotId);
    if (!Number.isInteger(id)) {
      throw new BadRequestException('pilotId must be an integer');
    }
    const loggedIn = typeof authorization === 'string' && authorization.trim().length > 0;
    return from(this.getPilotUseCase.execute(id, loggedIn));
  }
}
