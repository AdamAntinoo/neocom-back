import { Module } from '@nestjs/common';
import { PILOT_SOURCE } from '../application/ports/pilot-source.port.js';
import { GetPilotUseCase } from '../application/use-cases/get-pilot.usecase.js';
import { V1PilotController } from './adapters/inbound/pilot/v1-pilot.controller.js';
import { PilotIdSource } from './adapters/outbound/pilot/pilot-id-source.adapter.js';

@Module({
  controllers: [V1PilotController],
  providers: [GetPilotUseCase, { provide: PILOT_SOURCE, useClass: PilotIdSource }],
})
export class PilotModule {}
