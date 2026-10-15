import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService, NEOCOM_SSO_STATE } from '@Infra/auth/auth.service.js';

interface CallbackBody {
  code?: string;
  state?: string;
}

@Controller()
export class V1AuthController {
  constructor(private readonly auth: AuthService) {}

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
}
