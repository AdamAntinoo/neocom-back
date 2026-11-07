import { Module } from '@nestjs/common';
import { EveItemModule } from '@Infra/eveitem.module.js';
import { SpaceLocationModule } from '@Infra/spacelocation.module.js';
import { V1UniverseController } from '@Infra/adapters/inbound/universe/v1-universe.controller.js';

/**
 * Inbound HTTP for `api/v1/universe/*` — one controller; providers stay in feature modules.
 */
@Module({
  imports: [SpaceLocationModule, EveItemModule],
  controllers: [V1UniverseController],
})
export class UniverseModule {}
