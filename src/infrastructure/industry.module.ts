import { Module } from '@nestjs/common';
import { INDUSTRY_PORT } from 'neocom-domain';
import { BLUEPRINT_DTO_LOADER } from '@App/ports/blueprint-dto-loader.port.js';
import { GetPilotBlueprintsUseCase } from '@App/use-cases/get-pilot-blueprints.usecase.js';
import { AuthModule } from '@Infra/auth/auth.module.js';
import { V1IndustryController } from '@Infra/adapters/inbound/industry/v1-industry.controller.js';
import { EsiIndustryAdapter } from '@Infra/adapters/outbound/industry/esi-industry.adapter.js';
import { SpaceLocationModule } from '@Infra/spacelocation.module.js';

@Module({
  imports: [AuthModule, SpaceLocationModule],
  controllers: [V1IndustryController],
  providers: [
    GetPilotBlueprintsUseCase,
    EsiIndustryAdapter,
    { provide: INDUSTRY_PORT, useExisting: EsiIndustryAdapter },
    { provide: BLUEPRINT_DTO_LOADER, useExisting: EsiIndustryAdapter },
  ],
})
export class IndustryModule {}
