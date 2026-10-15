import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { NeocomBackendError } from '@Infra/errors/neocom-backend.error.js';

@Catch(NeocomBackendError)
export class NeocomBackendErrorFilter implements ExceptionFilter {
  catch(exception: NeocomBackendError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(exception.httpStatus).json({
      errors: exception.errors,
      ...(exception.traceId === undefined ? {} : { traceId: exception.traceId }),
    });
  }
}
