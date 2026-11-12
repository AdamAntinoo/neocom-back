import { PilotV2, PublicPilotV1, type PilotPort } from 'neocom-domain';
import { GetPilotUseCase } from './get-pilot.usecase.js';

const pilotFields = {
  pilotId: 93813310,
  name: 'Perico Tuerto',
  totalSkillpoints: 12,
  walletBalance: 34,
  currentShipName: 'Venture',
  currentShipTypeName: 'Venture',
  lastKnownLocation: {},
};

describe('GetPilotUseCase', () => {
  const source: PilotPort = {
    findById: (pilotId: number) =>
      Promise.resolve(new PilotV2({ ...pilotFields, pilotId })),
  };
  const useCase = new GetPilotUseCase(source);

  it('returns PublicPilotV1 without private fields when not logged in', async () => {
    const result = await useCase.execute(93813310, false);
    expect(result).toBeInstanceOf(PublicPilotV1);
    expect(result.getJsonClass()).toBe('PublicPilotV1');
    expect(result.getPilotId()).toBe(93813310);
    expect(result.getName()).toBe('Perico Tuerto');
    expect(result).not.toHaveProperty('totalSkillpoints');
    expect(result).not.toHaveProperty('walletBalance');
    expect(result).not.toHaveProperty('currentShipName');
    expect(result).not.toHaveProperty('currentShipTypeName');
    expect(result).not.toHaveProperty('lastKnownLocation');
  });

  it('returns PilotV2 with private fields when logged in', async () => {
    const result = await useCase.execute(93813310, true);
    expect(result).toBeInstanceOf(PilotV2);
    expect(result.getJsonClass()).toBe('PilotV2');
    const loggedIn = result as PilotV2;
    expect(loggedIn.getTotalSkillpoints()).toBe(12);
    expect(loggedIn.getWalletBalance()).toBe(34);
    expect(loggedIn.getCurrentShipName()).toBe('Venture');
    expect(loggedIn.getCurrentShipTypeName()).toBe('Venture');
  });
});
