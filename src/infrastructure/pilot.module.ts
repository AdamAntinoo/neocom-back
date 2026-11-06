import { Module } from '@nestjs/common';
import { PILOT_PORT } from 'neocom-domain';
import { GetPilotUseCase } from '@App/use-cases/get-pilot.usecase.js';
import { V1PilotController } from '@Inbound/pilot/v1-pilot.controller.js';
import { EsiPilotSource } from '@Outbound/pilot/esi-pilot-source.adapter.js';

@Module({
  controllers: [V1PilotController],
  providers: [GetPilotUseCase, { provide: PILOT_PORT, useClass: EsiPilotSource }],
})
export class PilotModule {}
