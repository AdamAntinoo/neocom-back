import { Controller, Get, Headers, Param, ParseIntPipe, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { PilotV2, PublicPilotV1 } from 'neocom-domain';
import { GetPilotUseCase } from '@App/use-cases/get-pilot.usecase.js';
import { GetPilotAssetsUseCase } from '@App/use-cases/get-pilot-assets.usecase.js';
import type { PilotApi } from '@Infra/adapters/api/pilot.api.js';
import type { PilotAssetNode } from '@Infra/adapters/inbound/dto/located-asset-container-v1.dto.js';
import {
  NEOCOM_ACCESS,
  parseAccessCookie,
} from '@Infra/adapters/services/auth-cookies.service.js';
import {
  ExceptionCatalog,
  exceptionPayload,
} from '@Infra/adapters/exceptions/index.js';

@Controller()
export class V1PilotController implements PilotApi {
  constructor(
    private readonly getPilotUseCase: GetPilotUseCase,
    private readonly getPilotAssetsUseCase: GetPilotAssetsUseCase,
  ) {}

  @Get('v1/pilots/:pilotId')
  public async getPilot(
    @Param('pilotId') pilotId: number,
    @Headers('authorization') authorization?: string,
  ): Promise<PublicPilotV1 | PilotV2> {
    const id = Number(pilotId);
    if (!Number.isInteger(id)) {
      throw ExceptionCatalog.INVALID_PILOT_ID.doThrow(
        'pilotId',
        exceptionPayload().field('pilotId').container('path').value(String(pilotId)).build(),
      );
    }
    const loggedIn = typeof authorization === 'string' && authorization.trim().length > 0;
    return this.getPilotUseCase.execute(id, loggedIn);
  }

  /** Authenticated full pilot asset list (AST-007 / AST-009). */
  @Get('v1/pilots/:pilotId/assets')
  public async getPilotAssets(
    @Param('pilotId', ParseIntPipe) pilotId: number,
    @Req() req: Request,
  ): Promise<PilotAssetNode[]> {
    const auth = parseAccessCookie(req.cookies?.[NEOCOM_ACCESS]);
    return this.getPilotAssetsUseCase.execute(pilotId, auth);
  }

  /** Authenticated assets filtered to one location (AST-013). */
  @Get('v1/pilots/:pilotId/assets/locations/:locationId')
  public async getPilotAssetsByLocation(
    @Param('pilotId', ParseIntPipe) pilotId: number,
    @Param('locationId', ParseIntPipe) locationId: number,
    @Req() req: Request,
  ): Promise<PilotAssetNode[]> {
    const auth = parseAccessCookie(req.cookies?.[NEOCOM_ACCESS]);
    return this.getPilotAssetsUseCase.executeForLocation(pilotId, locationId, auth);
  }
}
