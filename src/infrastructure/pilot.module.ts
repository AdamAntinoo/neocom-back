import { Module } from '@nestjs/common';
import { PILOT_SOURCE } from '@App/ports/pilot-source.port.js';
import { GetPilotUseCase } from '@App/use-cases/get-pilot.usecase.js';
import { V1PilotController } from '@Infra/adapters/inbound/pilot/v1-pilot.controller.js';
import { EsiPilotSource } from '@Infra/adapters/outbound/pilot/esi-pilot-source.adapter.js';

@Module({
  controllers: [V1PilotController],
  providers: [GetPilotUseCase, { provide: PILOT_SOURCE, useClass: EsiPilotSource }],
})
export class PilotModule {}
