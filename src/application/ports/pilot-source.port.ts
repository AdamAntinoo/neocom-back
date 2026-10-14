import type { PilotV2 } from '../../domain/pilot/pilot.js';

export const PILOT_SOURCE = Symbol('PILOT_SOURCE');

export interface PilotSource {
  findById(pilotId: number): Promise<PilotV2>;
}
