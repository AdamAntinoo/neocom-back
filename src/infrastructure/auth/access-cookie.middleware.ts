import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { NEOCOM_ACCESS } from './auth-cookies.js';

/**
 * When `neocom_access` is present, refresh/replace it via EsiTokenManager (BACK-016, BACK-017).
 * Skips the auth callback route so code exchange is not blocked.
 */
@Injectable()
export class AccessCookieMiddleware implements NestMiddleware {
  constructor(private readonly auth: AuthService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (req.path === '/v1/auth/callback' || req.originalUrl.startsWith('/v1/auth/callback')) {
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
