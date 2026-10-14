import type { PilotV1Dto } from '@Generated/pilot/model/pilot-v1-dto.js';

export interface PilotApi {
  getPilot(pilotId: number): Promise<PilotV1Dto>;
}
