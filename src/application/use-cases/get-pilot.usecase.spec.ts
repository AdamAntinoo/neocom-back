import { GetPilotUseCase } from './get-pilot.usecase.js';
import type { PilotSource } from '../ports/pilot-source.port.js';
import type { PilotV2 } from '../../domain/pilot/pilot.js';

const pilot: PilotV2 = {
  pilotId: 93813310,
  name: 'Perico Tuerto',
  totalSkillpoints: 12,
  walletBalance: 34,
  currentShipName: 'Venture',
  currentShipTypeName: 'Venture',
  lastKnownLocation: {},
};

describe('GetPilotUseCase', () => {
  const source: PilotSource = {
    findById: (pilotId: number) => Promise.resolve({ ...pilot, pilotId }),
  };
  const useCase = new GetPilotUseCase(source);

  it('returns a PilotDto for the pilot identifier and omits the private section when not logged in', async () => {
    const dto = await useCase.execute(93813310, false);
    expect(dto.pilotId).toBe(93813310);
    expect(dto.name).toBe('Perico Tuerto');
    expect(dto).not.toHaveProperty('totalSkillpoints');
    expect(dto).not.toHaveProperty('walletBalance');
    expect(dto).not.toHaveProperty('currentShipName');
    expect(dto).not.toHaveProperty('currentShipTypeName');
    expect(dto).not.toHaveProperty('lastKnownLocation');
  });

  it('includes the private section when logged in', async () => {
    const dto = await useCase.execute(93813310, true);
    expect(dto.totalSkillpoints).toBe(12);
    expect(dto.walletBalance).toBe(34);
    expect(dto.currentShipName).toBe('Venture');
    expect(dto.currentShipTypeName).toBe('Venture');
    expect(dto.lastKnownLocation).toEqual({});
  });
});
