import { Inject, Injectable } from '@nestjs/common';
import type { PilotDto } from '../../infrastructure/generated/pilot/model/pilot-dto.js';
import type { PilotV2 } from '../../domain/pilot/pilot.js';
import { PILOT_SOURCE, type PilotSource } from '../ports/pilot-source.port.js';

const PRIVATE_FIELDS = [
  'totalSkillpoints',
  'walletBalance',
  'currentShipName',
  'currentShipTypeName',
  'lastKnownLocation',
] as const satisfies readonly (keyof PilotDto)[];

@Injectable()
export class GetPilotUseCase {
  constructor(@Inject(PILOT_SOURCE) private readonly pilots: PilotSource) {}

  async execute(pilotId: number, loggedIn: boolean): Promise<PilotDto> {
    const pilot = await this.pilots.findById(pilotId);
    return toPilotDto(pilot, loggedIn);
  }
}

function toPilotDto(pilot: PilotV2, loggedIn: boolean): PilotDto {
  const dto: PilotDto = {
    pilotId: pilot.pilotId,
    name: pilot.name,
    corporation: pilot.corporation,
    birthday: pilot.birthday,
    description: pilot.description,
    gender: pilot.gender,
    securityStatus: pilot.securityStatus,
    url4Icon: pilot.url4Icon,
    raceData: pilot.raceData,
    ancestryData: pilot.ancestryData,
    bloodlineData: pilot.bloodlineData,
  };
  if (loggedIn) {
    dto.totalSkillpoints = pilot.totalSkillpoints;
    dto.walletBalance = pilot.walletBalance;
    dto.currentShipName = pilot.currentShipName;
    dto.currentShipTypeName = pilot.currentShipTypeName;
    dto.lastKnownLocation = pilot.lastKnownLocation;
  }
  for (const field of PRIVATE_FIELDS) {
    if (!loggedIn || dto[field] === undefined) {
      delete dto[field];
    }
  }
  return dto;
}
