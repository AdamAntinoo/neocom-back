import { Injectable } from '@nestjs/common';
import type { PilotSource } from '../../../../application/ports/pilot-source.port.js';
import type { PilotV2 } from '../../../../domain/pilot/pilot.js';

@Injectable()
export class PilotIdSource implements PilotSource {
  findById(pilotId: number): Promise<PilotV2> {
    return Promise.resolve({ pilotId });
  }
}
