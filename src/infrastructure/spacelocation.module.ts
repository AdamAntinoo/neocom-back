import { Module } from '@nestjs/common';
import { GetSpaceLocationUseCase } from '@App/use-cases/get-space-location.usecase.js';
import { LOCATION_CACHE } from '@Domain/ports/location-cache.port.js';
import { LOCATION_CATALOG } from '@Domain/ports/location-catalog.port.js';
import { V1SpaceLocationController } from '@Infra/adapters/inbound/universe/v1-spacelocation.controller.js';
import { EsiRedisLocationCatalog } from '@Infra/adapters/outbound/spacelocation/esi-redis-location-catalog.adapter.js';
import { RedisLocationCache } from '@Infra/adapters/outbound/spacelocation/redis-location-cache.adapter.js';

@Module({
  controllers: [V1SpaceLocationController],
  providers: [
    GetSpaceLocationUseCase,
    RedisLocationCache,
    { provide: LOCATION_CACHE, useExisting: RedisLocationCache },
    EsiRedisLocationCatalog,
    { provide: LOCATION_CATALOG, useExisting: EsiRedisLocationCatalog },
  ],
  exports: [GetSpaceLocationUseCase, LOCATION_CATALOG, LOCATION_CACHE],
})
export class SpaceLocationModule {}
