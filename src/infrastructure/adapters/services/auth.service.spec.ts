import { describe, expect, it, vi } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import { NeocomBackendError } from 'neocom-domain';
import { formatAccessCookie, parseAccessCookie } from '@Infra/adapters/services/auth-cookies.service.js';
import { AuthService } from './auth.service.js';

describe('auth cookies', () => {
  it('formats and parses accessToken|characterName|characterId', () => {
    const raw = formatAccessCookie({
      accessToken: 'tok|en',
      characterName: 'Perico Tuerto',
      characterId: 93813310,
    });
    expect(raw).toBe('tok|en|Perico Tuerto|93813310');
    expect(parseAccessCookie(raw)).toEqual({
      accessToken: 'tok|en',
      characterName: 'Perico Tuerto',
      characterId: 93813310,
    });
  });
});

describe('AuthService', () => {
  const tokens = {
    addCharacter: vi.fn(),
    getToken: vi.fn(),
    getStoredToken: vi.fn(),
    listCharacters: vi.fn(),
  };
  const res = {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  };

  const service = new AuthService(tokens as never);

  it('rejects a state mismatch without calling addCharacter', async () => {
    await expect(service.exchangeCode('code', 'a', 'b', res as never)).rejects.toBeInstanceOf(
      NeocomBackendError,
    );
    expect(tokens.addCharacter).not.toHaveBeenCalled();
  });

  it('exchanges a matching code and sets neocom_access', async () => {
    tokens.addCharacter.mockResolvedValue({
      characterId: 42,
      characterName: 'Pilot',
    });
    tokens.getToken.mockResolvedValue('access-token');

    const result = await service.exchangeCode('code', 'state', 'state', res as never);

    expect(result).toEqual({ characterId: 42, characterName: 'Pilot' });
    expect(res.cookie).toHaveBeenCalledWith(
      'neocom_access',
      'access-token|Pilot|42',
      expect.objectContaining({
        path: '/',
        sameSite: 'lax',
        httpOnly: false,
        maxAge: 1_200_000,
      }),
    );
    expect(res.clearCookie).toHaveBeenCalledWith('neocom_return', expect.any(Object));
    expect(res.clearCookie).toHaveBeenCalledWith('neocom_sso_state', expect.any(Object));
  });

  it('rewrites neocom_access when getToken succeeds for another character', async () => {
    tokens.getToken.mockResolvedValue('new-token');
    tokens.getStoredToken.mockResolvedValue({ characterName: 'Other', characterId: 99 });

    const next = await service.refreshAccessCookie('old|Other|99', res as never);

    expect(next).toEqual({ accessToken: 'new-token', characterName: 'Other', characterId: 99 });
    expect(res.cookie).toHaveBeenCalledWith(
      'neocom_access',
      'new-token|Other|99',
      expect.objectContaining({ httpOnly: false, maxAge: 1_200_000 }),
    );
  });

  it('responds 401 when the token cannot be replaced', async () => {
    tokens.getToken.mockRejectedValue(new Error('revoked'));
    try {
      await service.refreshAccessCookie('old|Pilot|1', res as never);
      expect.unreachable('should throw');
    } catch (error) {
      expect(error).toBeInstanceOf(NeocomBackendError);
      expect((error as NeocomBackendError).httpStatus).toBe(HttpStatus.UNAUTHORIZED);
    }
  });

  it('binds a stored session from tokens.json for Postman', async () => {
    tokens.listCharacters.mockResolvedValue([
      { characterId: 99, characterName: 'Other' },
      { characterId: 42, characterName: 'Pilot' },
    ]);
    tokens.getToken.mockResolvedValue('access-token');
    tokens.getStoredToken.mockResolvedValue({ characterId: 42, characterName: 'Pilot' });

    const payload = await service.bindStoredSession(42, res as never);

    expect(payload).toEqual({
      characterId: 42,
      characterName: 'Pilot',
      pilotId: 42,
      cookieName: 'neocom_access',
      neocomAccessCookie: 'access-token|Pilot|42',
      authorization: 'present',
      characters: [
        { characterId: 99, characterName: 'Other' },
        { characterId: 42, characterName: 'Pilot' },
      ],
    });
    expect(res.cookie).toHaveBeenCalledWith(
      'neocom_access',
      'access-token|Pilot|42',
      expect.objectContaining({ httpOnly: false }),
    );
  });

  it('defaults bindStoredSession to the first stored character', async () => {
    tokens.listCharacters.mockResolvedValue([{ characterId: 7, characterName: 'First' }]);
    tokens.getToken.mockResolvedValue('tok');
    tokens.getStoredToken.mockResolvedValue({ characterId: 7, characterName: 'First' });

    const payload = await service.bindStoredSession(undefined, res as never);

    expect(payload.characterId).toBe(7);
    expect(payload.neocomAccessCookie).toBe('tok|First|7');
  });

  it('rejects bindStoredSession when storage is empty', async () => {
    tokens.listCharacters.mockResolvedValue([]);
    await expect(service.bindStoredSession(undefined, res as never)).rejects.toBeInstanceOf(
      NeocomBackendError,
    );
  });
});
