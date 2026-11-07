import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { LayerLogger } from './layer-logging.js';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = LayerLogger.for('http', 'RequestLogging');

  use(req: Request, res: Response, next: NextFunction) {
    this.logger.log('>>> Request->', {
      method: req.method,
      originalUrl: req.originalUrl,
      // Avoid dumping Authorization / Cookie secrets at log level
      hasAuthorization: Boolean(req.headers.authorization),
      hasCookie: Boolean(req.headers.cookie),
    });
    if (next) {
      next();
    }
  }
}
