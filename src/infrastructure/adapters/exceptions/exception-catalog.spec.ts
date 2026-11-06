import { HttpStatus } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { NeocomBackendError, exceptionPayload } from 'neocom-domain';
import { ExceptionCatalog } from './exception-catalog.js';

describe('ExceptionCatalog', () => {
  it('doThrow fills message params and payload without throwing', () => {
    const error = ExceptionCatalog.NOT_FOUND.doThrow(
      'No blueprints (or pilot) for id 42.',
      exceptionPayload().field('pilotId').container('path').value('42').build(),
    );
    expect(error).toBeInstanceOf(NeocomBackendError);
    expect(error.httpStatus).toBe(HttpStatus.NOT_FOUND);
    expect(error.errors).toEqual([
      {
        code: 'NOT_FOUND',
        description: 'No blueprints (or pilot) for id 42.',
        field: 'pilotId',
        container: 'path',
        value: '42',
      },
    ]);
  });

  it('doThrow works with payload only', () => {
    const error = ExceptionCatalog.INVALID_PILOT_ID.doThrow(
      'pilotId',
      exceptionPayload().field('pilotId').container('path').value('x').build(),
    );
    expect(error.httpStatus).toBe(HttpStatus.BAD_REQUEST);
    expect(error.errors[0]?.description).toBe('pilotId must be an integer.');
  });
});
