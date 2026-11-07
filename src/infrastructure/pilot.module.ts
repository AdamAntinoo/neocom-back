import { Module } from '@nestjs/common';
import { PILOT_PORT } from 'neocom-domain';
import { GetPilotUseCase } from '@App/use-cases/get-pilot.usecase.js';
import { GetPilotAssetsUseCase } from '@App/use-cases/get-pilot-assets.usecase.js';
import { PILOT_ASSETS_PORT } from '@Domain/ports/pilot-assets.port.js';
import { PILOT_ASSET_CACHE } from '@Domain/ports/pilot-asset-cache.port.js';
import { AuthModule } from '@Infra/auth/auth.module.js';
import { EveItemModule } from '@Infra/eveitem.module.js';
import { SpaceLocationModule } from '@Infra/spacelocation.module.js';
import { V1PilotController } from '@Inbound/pilot/v1-pilot.controller.js';
import { EsiPilotSource } from '@Outbound/pilot/esi-pilot-source.adapter.js';
import { EsiPilotAssetsAdapter } from '@Outbound/pilot/esi-pilot-assets.adapter.js';
import { RedisPilotAssetCache } from '@Outbound/persistence/redis-pilot-asset-cache.adapter.js';

@Module({
  imports: [AuthModule, EveItemModule, SpaceLocationModule],
  controllers: [V1PilotController],
  providers: [
    GetPilotUseCase,
    GetPilotAssetsUseCase,
    EsiPilotSource,
    { provide: PILOT_PORT, useExisting: EsiPilotSource },
    EsiPilotAssetsAdapter,
    { provide: PILOT_ASSETS_PORT, useExisting: EsiPilotAssetsAdapter },
    RedisPilotAssetCache,
    { provide: PILOT_ASSET_CACHE, useExisting: RedisPilotAssetCache },
  ],
})
export class PilotModule {}
