import { describe, expect, it, vi } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { formatAccessCookie, parseAccessCookie } from './auth-cookies.js';
import { NeocomBackendError } from '@Infra/errors/neocom-backend.error.js';

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
});
