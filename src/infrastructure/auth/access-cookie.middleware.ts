import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { NEOCOM_ACCESS } from '@Infra/adapters/services/auth-cookies.service.js';
import { AuthService } from '@Infra/adapters/services/auth.service.js';

/**
 * When `neocom_access` is present, refresh/replace it via EsiTokenManager (BACK-016, BACK-017).
 * Skips the auth callback route so code exchange is not blocked.
 */
@Injectable()
export class AccessCookieMiddleware implements NestMiddleware {
  constructor(private readonly auth: AuthService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (
      req.path === '/v1/auth/callback' ||
      req.originalUrl.startsWith('/v1/auth/callback') ||
      req.path === '/v1/auth/session' ||
      req.originalUrl.startsWith('/v1/auth/session')
    ) {
      next();
      return;
    }
    const raw = req.cookies?.[NEOCOM_ACCESS];
    if (raw == null || raw === '') {
      next();
      return;
    }
    try {
      await this.auth.refreshAccessCookie(raw, res);
      next();
    } catch (error) {
      next(error);
    }
  }
}
