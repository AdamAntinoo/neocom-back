import type { PilotV2 } from '@Domain/pilot/pilot.js';

export const PILOT_SOURCE = Symbol('PILOT_SOURCE');

export interface PilotSource {
  findById(pilotId: number): Promise<PilotV2>;
}
