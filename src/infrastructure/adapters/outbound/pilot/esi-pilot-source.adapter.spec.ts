import { HttpStatus } from '@nestjs/common';
import { EsiError } from '@lgriffin/esi.ts';
import type { AllianceInfo, Ancestry, Bloodline, CharacterInfo, CorporationInfo, Race } from '@lgriffin/esi.ts';
import { NeocomBackendError } from '@Infra/errors/neocom-backend.error.js';
import { readPilotFromEsi, type EsiPilotApi } from './esi-pilot-source.adapter.js';

const info = {
  name: 'Perico Tuerto',
  corporation_id: 98000001,
  alliance_id: 99000001,
  ancestry_id: 7,
  bloodline_id: 1,
  race_id: 2,
  gender: 'male',
  birthday: '2014-01-01T00:00:00Z',
  description: 'public',
  security_status: 1.5,
} as CharacterInfo;

const corporation = {
  name: 'Corp',
  ticker: 'CRP',
  description: 'corp',
  ceo_id: 11,
  creator_id: 12,
  date_founded: '2010-01-01T00:00:00Z',
  member_count: 3,
  shares: 1000,
  tax_rate: 0.1,
  alliance_id: 99000001,
} as CorporationInfo;

const alliance = {
  name: 'Ally',
  ticker: 'ALY',
  creator_id: 12,
  creator_corporation_id: 98000001,
  date_founded: '2009-01-01T00:00:00Z',
} as AllianceInfo;

function esi(publicInfo: () => Promise<CharacterInfo>): EsiPilotApi {
  return {
    characters: {
      getCharacterPublicInfo: publicInfo,
      getCharacterPortrait: () => Promise.resolve({ px128x128: 'https://img/pilot' }),
    },
    corporations: {
      getCorporationInfo: () => Promise.resolve(corporation),
      getCorporationIcon: () => Promise.resolve({ px128x128: 'https://img/corp' }),
    },
    alliance: {
      getAllianceById: () => Promise.resolve(alliance),
      getIcons: () => Promise.resolve({ px128x128: 'https://img/ally' }),
    },
    universe: {
      getRaces: () => Promise.resolve([{ race_id: 2, name: 'Caldari', description: 'State', alliance_id: 5 } as Race]),
      getAncestries: () => Promise.resolve([{ id: 7, name: 'Merchandisers', bloodline_id: 1, description: 'trade' } as Ancestry]),
      getBloodlines: () =>
        Promise.resolve([
          {
            bloodline_id: 1,
            name: 'Deteis',
            description: 'blood',
            race_id: 2,
            corporation_id: 1,
            ship_type_id: null,
            charisma: 1,
            intelligence: 1,
            memory: 1,
            perception: 1,
            willpower: 1,
          } as Bloodline,
        ]),
    },
  };
}

describe('readPilotFromEsi', () => {
  it('maps public ESI character, corporation, portrait, and universe data onto the pilot', async () => {
    const pilot = await readPilotFromEsi(esi(() => Promise.resolve(info)), 93813310);

    expect(pilot).toEqual({
      pilotId: 93813310,
      name: 'Perico Tuerto',
      description: 'public',
      birthday: '2014-01-01T00:00:00Z',
      gender: 'male',
      securityStatus: 1.5,
      url4Icon: 'https://img/pilot',
      corporation: {
        corporationId: 98000001,
        name: 'Corp',
        ticker: 'CRP',
        description: 'corp',
        ceoid: 11,
        creatorId: 12,
        dateFounded: '2010-01-01T00:00:00Z',
        memberCount: 3,
        shares: 1000,
        taxRate: 0.1,
        url4Icon: 'https://img/corp',
        allianceId: 99000001,
        alliance: {
          allianceId: 99000001,
          name: 'Ally',
          ticker: 'ALY',
          url4Icon: 'https://img/ally',
        },
      },
      raceData: { raceId: 2, name: 'Caldari', description: 'State', allianceId: 5 },
      ancestryData: { name: 'Merchandisers' },
      bloodlineData: { name: 'Deteis' },
    });
  });

  it('returns not found when ESI has no character', async () => {
    await expect(readPilotFromEsi(esi(() => Promise.reject(new EsiError(404, 'missing'))), 93813310)).rejects.toMatchObject({
      httpStatus: HttpStatus.NOT_FOUND,
      errors: [
        {
          code: 'PILOT_NOT_FOUND',
          description: 'No pilot exists for this identifier.',
          field: 'pilotId',
          container: 'path',
          value: '93813310',
        },
      ],
    } satisfies Partial<NeocomBackendError>);
  });

  it('returns the pilot source unavailable when ESI is down', async () => {
    await expect(readPilotFromEsi(esi(() => Promise.reject(new EsiError(503, 'unavailable'))), 93813310)).rejects.toMatchObject({
      httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
      errors: [
        {
          code: 'INTERNAL_SERVER_ERROR',
          description: 'The pilot source is not available.',
        },
      ],
    });
  });
});
