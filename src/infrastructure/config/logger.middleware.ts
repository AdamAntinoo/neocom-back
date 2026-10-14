import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('RequestLogging');

  use(req: Request, res: Response, next: NextFunction) {
    this.logger.log(`>>> Request->`, {
      headers: req.headers,
      body: req.body,
      originalUrl: req.originalUrl,
    });
    if (next) {
      next();
    }
  }
}
