import type { BlueprintV1Dto } from '@Infra/adapters/inbound/dto/blueprint-v1.dto.js';

export const BLUEPRINT_DTO_LOADER = Symbol('BLUEPRINT_DTO_LOADER');

/** Loads pilot blueprint interchange DTOs from ESI (before catalog embed). */
export interface BlueprintDtoLoader {
  loadPilotBlueprintDtos(pilotId: number): Promise<BlueprintV1Dto[]>;
}
