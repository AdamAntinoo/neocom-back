import { Controller, Get, Param, ParseIntPipe, Req } from '@nestjs/common';
import type { Request } from 'express';
import { GetSpaceLocationUseCase } from '@App/use-cases/get-space-location.usecase.js';
import type { SpaceLocation } from '@Domain/spacelocation/space-location.js';
import {
  NEOCOM_ACCESS,
  parseAccessCookie,
} from '@Infra/adapters/services/auth-cookies.service.js';

/**
 * LOC-010 — kind is not in the path; catalog decides locationType for the id.
 * Access cookie is implicit on the request for structure ESI (LOC-135).
 */
@Controller('api/v1/universe')
export class V1SpaceLocationController {
  constructor(private readonly getSpaceLocation: GetSpaceLocationUseCase) {}

  @Get('spacelocations/:locationId')
  getById(
    @Param('locationId', ParseIntPipe) locationId: number,
    @Req() req: Request,
  ): Promise<SpaceLocation> {
    const auth = parseAccessCookie(req.cookies?.[NEOCOM_ACCESS]);
    return this.getSpaceLocation.execute(locationId, auth);
  }
}
