import { EsiTokenManager } from '@lgriffin/esi.ts';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { NeocomBackendError } from '@Infra/errors/neocom-backend.error.js';
import {
  clearLoginCookies,
  NEOCOM_SSO_STATE,
  parseAccessCookie,
  setAccessCookie,
  type AccessCookieValue,
} from './auth-cookies.js';
import { ESI_TOKEN_MANAGER } from './esi-token-manager.provider.js';

@Injectable()
export class AuthService {
  constructor(@Inject(ESI_TOKEN_MANAGER) private readonly tokens: EsiTokenManager) {}

  /** BACK-015 — exchange code on matching state and set `neocom_access`. */
  async exchangeCode(
    code: string,
    state: string,
    ssoStateCookie: string | undefined,
    res: Response,
  ): Promise<{ characterId: number; characterName: string }> {
    if (!code || !state || state !== ssoStateCookie) {
      throw new NeocomBackendError(HttpStatus.BAD_REQUEST, [
        {
          code: 'SSO_STATE_MISMATCH',
          description: 'The request state does not match. Caller not verified.',
          field: 'state',
          container: 'body',
          value: state,
        },
      ]);
    }

    const stored = await this.tokens.addCharacter(code);
    const accessToken = await this.tokens.getToken(stored.characterId);
    setAccessCookie(res, {
      accessToken,
      characterName: stored.characterName,
      characterId: stored.characterId,
    });
    clearLoginCookies(res);
    return { characterId: stored.characterId, characterName: stored.characterName };
  }

  /**
   * BACK-016 / BACK-017 — reuse or refresh token for the character in the cookie.
   * Rewrites `neocom_access`; returns 401 when replacement fails.
   */
  async refreshAccessCookie(rawCookie: unknown, res: Response): Promise<AccessCookieValue> {
    const parsed = parseAccessCookie(rawCookie);
    if (parsed == null) {
      throw unauthorized();
    }
    try {
      const accessToken = await this.tokens.getToken(parsed.characterId);
      const stored = await this.tokens.getStoredToken(parsed.characterId);
      const characterName = stored?.characterName ?? parsed.characterName;
      const next = {
        accessToken,
        characterName,
        characterId: parsed.characterId,
      };
      setAccessCookie(res, next);
      return next;
    } catch {
      throw unauthorized();
    }
  }
}

function unauthorized(): NeocomBackendError {
  return new NeocomBackendError(HttpStatus.UNAUTHORIZED, [
    {
      code: 'TOKEN_UNAVAILABLE',
      description: 'The access token could not be replaced.',
    },
  ]);
}

export { NEOCOM_SSO_STATE };
