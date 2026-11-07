import { describe, expect, it } from 'vitest';
import { NeocomBackendError, exceptionPayload } from 'neocom-domain';
import { ExceptionCatalog } from './exception-catalog.js';

describe('ExceptionCatalog', () => {
  it('doThrow fills message params, payload, and catalog httpStatus', () => {
    const error = ExceptionCatalog.PILOT_NOT_FOUND.doThrow(
      '42',
      exceptionPayload().field('pilotId').container('path').value('42').build(),
    );
    expect(error).toBeInstanceOf(NeocomBackendError);
    expect(error.errors).toEqual([
      {
        code: 'PILOT_NOT_FOUND',
        description: 'No pilot exists for identifier 42.',
        field: 'pilotId',
        container: 'path',
        value: '42',
      },
    ]);
    expect(error.httpStatus).toBe(404);
  });

  it('doThrow works with payload only and keeps catalog httpStatus', () => {
    const error = ExceptionCatalog.INVALID_PILOT_ID.doThrow(
      'pilotId',
      exceptionPayload().field('pilotId').container('path').value('x').build(),
    );
    expect(error.errors[0]?.description).toBe('pilotId must be an integer.');
    expect(error.httpStatus).toBe(400);
  });

  it('every catalog entry carries its own httpStatus (no separate code map)', () => {
    for (const [name, entry] of Object.entries(ExceptionCatalog)) {
      expect(entry.httpStatus, name).toBeGreaterThanOrEqual(400);
      expect(entry.httpStatus, name).toBeLessThan(600);
    }
  });
});
