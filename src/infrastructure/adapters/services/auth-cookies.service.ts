import type { Response } from 'express';

export const NEOCOM_ACCESS = 'neocom_access';
export const NEOCOM_RETURN = 'neocom_return';
export const NEOCOM_SSO_STATE = 'neocom_sso_state';
export const ACCESS_COOKIE_MAX_AGE = 1200;

export interface AccessCookieValue {
  accessToken: string;
  characterName: string;
  characterId: number;
}

/** Cookie value: accessToken|characterName|characterId */
export function formatAccessCookie(value: AccessCookieValue): string {
  return `${value.accessToken}|${value.characterName}|${value.characterId}`;
}

export function parseAccessCookie(raw: unknown): AccessCookieValue | null {
  if (typeof raw !== 'string' || raw.length === 0) {
    return null;
  }
  const parts = raw.split('|');
  if (parts.length < 3) {
    return null;
  }
  const characterId = Number(parts[parts.length - 1]);
  const characterName = parts[parts.length - 2];
  const accessToken = parts.slice(0, parts.length - 2).join('|');
  if (!Number.isFinite(characterId) || characterName === '' || accessToken === '') {
    return null;
  }
  return { accessToken, characterName, characterId };
}

const cookieBase = {
  path: '/',
  sameSite: 'lax' as const,
  httpOnly: false,
};

export function setAccessCookie(res: Response, value: AccessCookieValue): void {
  res.cookie(NEOCOM_ACCESS, formatAccessCookie(value), {
    ...cookieBase,
    maxAge: ACCESS_COOKIE_MAX_AGE * 1000,
  });
}

export function clearLoginCookies(res: Response): void {
  res.clearCookie(NEOCOM_RETURN, { path: '/', sameSite: 'lax' });
  res.clearCookie(NEOCOM_SSO_STATE, { path: '/', sameSite: 'lax' });
}
