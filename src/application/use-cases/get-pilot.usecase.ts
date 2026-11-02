import { Inject, Injectable } from '@nestjs/common';
import {
  PILOT_PORT,
  PublicPilotV1,
  type PilotPort,
  type PilotV2,
  type PublicCorporationSummary,
  type PilotNameSummary,
} from 'neocom-domain';

/** Own-property wire view after Object.assign on domain pilot classes. */
type PilotWire = {
  pilotId: number;
  name?: string;
  corporation?: PublicCorporationSummary;
  birthday?: string;
  description?: string;
  gender?: string;
  securityStatus?: number;
  url4Icon?: string;
  raceData?: PilotNameSummary;
  ancestryData?: PilotNameSummary;
  bloodlineData?: PilotNameSummary;
};

@Injectable()
export class GetPilotUseCase {
  constructor(@Inject(PILOT_PORT) private readonly pilots: PilotPort) {}

  /**
   * Authenticated callers receive {@link PilotV2}; others receive {@link PublicPilotV1}
   * (private fields omitted — domain model, not a generated DTO).
   */
  async execute(pilotId: number, loggedIn: boolean): Promise<PublicPilotV1 | PilotV2> {
    const pilot = await this.pilots.findById(pilotId);
    if (loggedIn) {
      return pilot;
    }
    return toPublicPilot(pilot);
  }
}

function toPublicPilot(pilot: PilotV2): PublicPilotV1 {
  const wire = pilot as unknown as PilotWire;
  return new PublicPilotV1({
    pilotId: wire.pilotId,
    name: wire.name,
    corporation: wire.corporation,
    birthday: wire.birthday,
    description: wire.description,
    gender: wire.gender,
    securityStatus: wire.securityStatus,
    url4Icon: wire.url4Icon,
    raceData: wire.raceData,
    ancestryData: wire.ancestryData,
    bloodlineData: wire.bloodlineData,
  });
}
