import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import {
  ExceptionCatalog,
  exceptionPayload,
} from '@Infra/adapters/exceptions/index.js';
import {
  AuthService,
  NEOCOM_SSO_STATE,
  type StoredSessionPayload,
} from '@Infra/adapters/services/auth.service.js';

interface CallbackBody {
  code?: string;
  state?: string;
}

@Controller()
export class V1AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('v1/auth/callback')
  public async callback(
    @Body() body: CallbackBody,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ characterId: number; characterName: string }> {
    const ssoState =
      typeof req.cookies?.[NEOCOM_SSO_STATE] === 'string' ? req.cookies[NEOCOM_SSO_STATE] : undefined;
    return this.auth.exchangeCode(body.code ?? '', body.state ?? '', ssoState, res);
  }

  /**
   * Local Postman / tooling — return cookie + character fields after SSO was done outside
   * Postman (front login writes `tokens.json`). Disabled when ENVIRONMENT=production.
   */
  @Get('v1/auth/session')
  public async session(
    @Query('characterId') characterIdRaw: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StoredSessionPayload> {
    this.assertLocalToolingAllowed();
    const characterId = parseOptionalCharacterId(characterIdRaw);
    return this.auth.bindStoredSession(characterId, res);
  }

  private assertLocalToolingAllowed(): void {
    const environment = (this.config.get<string>('ENVIRONMENT') ?? '').toLowerCase();
    if (environment === 'production' || environment === 'prod') {
      throw ExceptionCatalog.NOT_FOUND.doThrow(
        exceptionPayload()
          .field('path')
          .container('url')
          .value('/v1/auth/session')
          .build(),
      );
    }
  }
}

function parseOptionalCharacterId(raw: string | undefined): number | undefined {
  if (raw == null || raw.trim() === '') {
    return undefined;
  }
  const id = Number(raw);
  if (!Number.isInteger(id)) {
    throw ExceptionCatalog.INVALID_PILOT_ID.doThrow(
      exceptionPayload().field('characterId').container('query').value(raw).build(),
    );
  }
  return id;
}
