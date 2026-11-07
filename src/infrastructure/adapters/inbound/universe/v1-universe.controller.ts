import { Controller, Get, Param, ParseIntPipe, Req } from '@nestjs/common';
import type { Request } from 'express';
import { GetEveItemByIdUseCase } from '@App/use-cases/get-eve-item-by-id.usecase.js';
import { GetPricedItemByIdUseCase } from '@App/use-cases/get-priced-item-by-id.usecase.js';
import { GetSpaceLocationUseCase } from '@App/use-cases/get-space-location.usecase.js';
import type { SpaceLocation } from '@Domain/spacelocation/space-location.js';
import type { EveItemV1Dto } from '@Infra/adapters/inbound/dto/eve-item-v1.dto.js';
import type { PricedItemV1Dto } from '@Infra/adapters/inbound/dto/priced-item-v1.dto.js';
import {
  NEOCOM_ACCESS,
  parseAccessCookie,
} from '@Infra/adapters/services/auth-cookies.service.js';

/**
 * Single inbound controller for `api/v1/universe/*`:
 * spacelocations (LOC-010 / LOC-135), eveitems (ITEM-017), pricedeveitems (ITEM-020).
 */
@Controller('api/v1/universe')
export class V1UniverseController {
  constructor(
    private readonly getSpaceLocation: GetSpaceLocationUseCase,
    private readonly getEveItemById: GetEveItemByIdUseCase,
    private readonly getPricedItemById: GetPricedItemByIdUseCase,
  ) {}

  @Get('spacelocations/:locationId')
  getSpaceLocationById(
    @Param('locationId', ParseIntPipe) locationId: number,
    @Req() req: Request,
  ): Promise<SpaceLocation> {
    const auth = parseAccessCookie(req.cookies?.[NEOCOM_ACCESS]);
    return this.getSpaceLocation.execute(locationId, auth);
  }

  @Get('eveitems/:itemId')
  getEveItemByIdPublic(
    @Param('itemId', ParseIntPipe) itemId: number,
  ): Promise<EveItemV1Dto> {
    return this.getEveItemById.execute(itemId);
  }

  @Get('pricedeveitems/:itemId')
  getPricedEveItemById(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Req() req: Request,
  ): Promise<PricedItemV1Dto> {
    const auth = parseAccessCookie(req.cookies?.[NEOCOM_ACCESS]);
    return this.getPricedItemById.execute(itemId, auth);
  }
}
