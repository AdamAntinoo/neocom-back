import { Module } from '@nestjs/common';
import { INDUSTRY_PORT } from 'neocom-domain';
import { GetPilotBlueprintsUseCase } from '@App/use-cases/get-pilot-blueprints.usecase.js';
import { AuthModule } from '@Infra/auth/auth.module.js';
import { V1IndustryController } from '@Infra/adapters/inbound/industry/v1-industry.controller.js';
import { EsiIndustryAdapter } from '@Infra/adapters/outbound/industry/esi-industry.adapter.js';

@Module({
  imports: [AuthModule],
  controllers: [V1IndustryController],
  providers: [
    GetPilotBlueprintsUseCase,
    { provide: INDUSTRY_PORT, useClass: EsiIndustryAdapter },
  ],
})
export class IndustryModule {}
