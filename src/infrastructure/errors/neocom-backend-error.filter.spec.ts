import { EsiError, EsiNetworkError } from '@lgriffin/esi.ts';
import { describe, expect, it, vi } from 'vitest';
import { NeocomBackendError } from 'neocom-domain';
import { NeocomBackendErrorFilter } from './neocom-backend-error.filter.js';

function mockHost(
  status: ReturnType<typeof vi.fn>,
  json: ReturnType<typeof vi.fn>,
) {
  return {
    switchToHttp: () => ({
      getResponse: () => ({ status, json }),
    }),
  };
}

describe('NeocomBackendErrorFilter', () => {
  const filter = new NeocomBackendErrorFilter();

  it('maps NeocomBackendError code to HTTP status and writes errors', () => {
    const status = vi.fn().mockReturnThis();
    const json = vi.fn();
    const error = new NeocomBackendError(404, [
      { code: 'LOCATION_NOT_FOUND', description: 'missing' },
    ]);

    filter.catch(error, mockHost(status, json) as never);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      errors: [{ code: 'LOCATION_NOT_FOUND', description: 'missing' }],
    });
  });

  it('writes EsiError with its statusCode', () => {
    const status = vi.fn().mockReturnThis();
    const json = vi.fn();
    const error = new EsiError(
      403,
      'Forbidden',
      'https://esi.evetech.net/latest/universe/structures/1/',
    );

    filter.catch(error, mockHost(status, json) as never);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({
      errors: [
        {
          code: 'ESI_ERROR',
          description: 'Forbidden',
          field: 'url',
          container: 'esi',
          value: error.url,
        },
      ],
    });
  });

  it('defaults EsiError statusCode 0 to 500', () => {
    const status = vi.fn().mockReturnThis();
    const json = vi.fn();
    const error = new EsiNetworkError(
      'connection reset',
      'https://esi.evetech.net/u/',
    );

    filter.catch(error, mockHost(status, json) as never);

    expect(status).toHaveBeenCalledWith(500);
    expect(json.mock.calls[0]?.[0].errors[0].code).toBe('ESI_ERROR');
  });
});
