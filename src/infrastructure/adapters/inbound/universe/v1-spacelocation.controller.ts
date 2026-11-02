import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { GetSpaceLocationUseCase } from '@App/use-cases/get-space-location.usecase.js';
import type { SpaceLocation } from '@Domain/spacelocation/space-location.js';

/**
 * LOC-010 — kind is not in the path; catalog decides locationType for the id.
 */
@Controller('api/v1/universe')
export class V1SpaceLocationController {
  constructor(private readonly getSpaceLocation: GetSpaceLocationUseCase) {}

  @Get('spacelocations/:locationId')
  getById(@Param('locationId', ParseIntPipe) locationId: number): Promise<SpaceLocation> {
    return this.getSpaceLocation.execute(locationId);
  }
}
