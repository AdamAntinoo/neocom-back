import { Inject, Injectable } from '@nestjs/common';
import type { PilotV1Dto } from '@Generated/pilot/model/pilot-v1-dto.js';
import type { PilotV2 } from '@Domain/pilot/pilot.js';
import { PILOT_SOURCE, type PilotSource } from '@App/ports/pilot-source.port.js';

const PRIVATE_FIELDS = [
  'totalSkillpoints',
  'walletBalance',
  'currentShipName',
  'currentShipTypeName',
  'lastKnownLocation',
] as const satisfies readonly (keyof PilotV1Dto)[];

@Injectable()
export class GetPilotUseCase {
  constructor(@Inject(PILOT_SOURCE) private readonly pilots: PilotSource) {}

  async execute(pilotId: number, loggedIn: boolean): Promise<PilotV1Dto> {
    const pilot = await this.pilots.findById(pilotId);
    return toPilotV1Dto(pilot, loggedIn);
  }
}

function toPilotV1Dto(pilot: PilotV2, loggedIn: boolean): PilotV1Dto {
  const dto: PilotV1Dto = {
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
