import { Module } from '@nestjs/common';
import { GetSpaceLocationUseCase } from '@App/use-cases/get-space-location.usecase.js';
import { LOCATION_CATALOG } from '@App/ports/location-catalog.port.js';
import { V1SpaceLocationController } from '@Infra/adapters/inbound/universe/v1-spacelocation.controller.js';
import { InMemoryLocationCatalog } from '@Infra/adapters/outbound/spacelocation/in-memory-location-catalog.adapter.js';

@Module({
  controllers: [V1SpaceLocationController],
  providers: [
    GetSpaceLocationUseCase,
    { provide: LOCATION_CATALOG, useClass: InMemoryLocationCatalog },
  ],
  exports: [GetSpaceLocationUseCase, LOCATION_CATALOG],
})
export class SpaceLocationModule {}
