import { EsiTokenManager, FileTokenStorage } from '@lgriffin/esi.ts';
import { ConfigService } from '@nestjs/config';

export const ESI_TOKEN_MANAGER = Symbol('ESI_TOKEN_MANAGER');

/** BACK-014 — locked FileTokenStorage and 10s SSO timeout. */
export function createEsiTokenManager(config: ConfigService): EsiTokenManager {
  const clientId = config.get<string>('ESI_SSO_CLIENT_ID') ?? '4664722d6bd0415683a04519e738a5fc';
  const clientSecret = config.get<string>('ESI_SSO_CLIENT_SECRET') ?? 'local-secret-placeholder';
  const callbackUrl =
    config.get<string>('ESI_SSO_CALLBACK_URL') ?? 'http://localhost:6001/app/login-callback';

  return new EsiTokenManager({
    clientId,
    clientSecret,
    callbackUrl,
    storage: new FileTokenStorage('./tokens.json', { lock: true }),
    ssoTimeoutMs: 10_000,
  });
}
