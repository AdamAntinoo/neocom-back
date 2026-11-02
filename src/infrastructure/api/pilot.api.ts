import type { PilotV2, PublicPilotV1 } from 'neocom-domain';

export interface PilotApi {
  getPilot(pilotId: number): Promise<PublicPilotV1 | PilotV2>;
}
