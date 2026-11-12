import { describe, expect, it, vi } from 'vitest';
import { EsiConfigurationError } from '@lgriffin/esi.ts';
import { NeocomBackendError } from 'neocom-domain';
import {
  attachPilotAccessToken,
  readPilotBlueprintDtosFromEsi,
} from './esi-industry.adapter.js';

describe('readPilotBlueprintDtosFromEsi', () => {
  it('maps ESI rows into BlueprintV1Dto with location fields', async () => {
    const esi = {
      characters: {
        getCharacterBlueprints: vi.fn().mockResolvedValue([
          {
            item_id: 101,
            type_id: 1245,
            location_id: 60006907,
            location_flag: 'Hangar',
            quantity: -2,
            time_efficiency: 0,
            material_efficiency: 10,
            runs: 300,
          },
        ]),
      },
    };
    const list = await readPilotBlueprintDtosFromEsi(esi, 42);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      jsonClass: 'BlueprintV1Dto',
      blueprintId: 101,
      blueprintTypeId: 1245,
      materialEfficiency: 10,
      timeEfficiency: 0,
      runs: 300,
      locationId: 60006907,
      locationFlag: 'Hangar',
      blueprintTypeIconURL: 'https://images.evetech.net/types/1245/bp',
    });
    expect(list[0].location).toBeUndefined();
  });

  it('maps missing ESI auth config to TOKEN_UNAVAILABLE', async () => {
    const esi = {
      characters: {
        getCharacterBlueprints: vi
          .fn()
          .mockRejectedValue(
            new EsiConfigurationError('NO_AUTH_TOKEN', 'missing token'),
          ),
      },
    };
    try {
      await readPilotBlueprintDtosFromEsi(esi, 42);
      expect.unreachable('should throw');
    } catch (error) {
      expect(error).toBeInstanceOf(NeocomBackendError);
      expect((error as NeocomBackendError).errors[0]?.code).toBe(
        'TOKEN_UNAVAILABLE',
      );
    }
  });
});

describe('attachPilotAccessToken', () => {
  it('sets access token and provider from the token manager', async () => {
    const esi = {
      characters: { getCharacterBlueprints: vi.fn() },
      setAccessToken: vi.fn(),
      setTokenProvider: vi.fn(),
    };
    const provider = vi.fn();
    const tokens = {
      getToken: vi.fn().mockResolvedValue('access-xyz'),
      tokenProviderFor: vi.fn().mockReturnValue(provider),
    };

    await attachPilotAccessToken(esi, tokens, 92002067);

    expect(tokens.getToken).toHaveBeenCalledWith(92002067);
    expect(esi.setAccessToken).toHaveBeenCalledWith('access-xyz');
    expect(esi.setTokenProvider).toHaveBeenCalledWith(provider);
  });

  it('maps token manager failures to TOKEN_UNAVAILABLE', async () => {
    const esi = {
      characters: { getCharacterBlueprints: vi.fn() },
      setAccessToken: vi.fn(),
    };
    const tokens = {
      getToken: vi.fn().mockRejectedValue(new Error('missing')),
      tokenProviderFor: vi.fn(),
    };
    await expect(attachPilotAccessToken(esi, tokens, 1)).rejects.toBeInstanceOf(
      NeocomBackendError,
    );
  });
});
