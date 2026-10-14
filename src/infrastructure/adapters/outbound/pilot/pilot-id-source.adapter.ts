import { Injectable } from '@nestjs/common';
import type { PilotSource } from '@App/ports/pilot-source.port.js';
import type { PilotV2 } from '@Domain/pilot/pilot.js';

@Injectable()
export class PilotIdSource implements PilotSource {
  findById(pilotId: number): Promise<PilotV2> {
    return Promise.resolve({ pilotId });
  }
}
