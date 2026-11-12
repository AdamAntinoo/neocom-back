import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { EsiError, isEsiError } from '@lgriffin/esi.ts';
import type { Response } from 'express';
import { NeocomBackendError } from 'neocom-domain';

/**
 * Maps catalogue {@link NeocomBackendError} and raw {@link EsiError} to HTTP JSON.
 * Catalogue status comes from {@link NeocomBackendError.httpStatus}.
 * ESI status comes from `EsiError.statusCode`; when that is missing or `0` (network /
 * client-side faults), the response is **500**.
 */
@Catch(NeocomBackendError, EsiError)
export class NeocomBackendErrorFilter implements ExceptionFilter {
  catch(exception: NeocomBackendError | EsiError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof NeocomBackendError) {
      // Status is owned by the catalog entry (via doThrow) — not a secondary code→status map.
      const status =
        Number.isFinite(exception.httpStatus) &&
        exception.httpStatus >= 400 &&
        exception.httpStatus < 600
          ? exception.httpStatus
          : HttpStatus.INTERNAL_SERVER_ERROR;
      response.status(status).json({
        errors: exception.errors,
        ...(exception.traceId === undefined
          ? {}
          : { traceId: exception.traceId }),
      });
      return;
    }

    if (isEsiError(exception)) {
      const status =
        Number.isFinite(exception.statusCode) && exception.statusCode > 0
          ? exception.statusCode
          : HttpStatus.INTERNAL_SERVER_ERROR;
      response.status(status).json({
        errors: [
          {
            code: 'ESI_ERROR',
            description: exception.message,
            ...(exception.url === undefined
              ? {}
              : { field: 'url', container: 'esi', value: exception.url }),
          },
        ],
        ...(exception.requestId === undefined
          ? {}
          : { requestId: exception.requestId }),
      });
      return;
    }
  }
}
