import { HttpStatus } from '@nestjs/common';
import { catalogEntry } from 'neocom-domain';

/**
 * Back-specific named exception catalog.
 * Entry machinery ({@link catalogEntry}, payload builder, {@link NeocomBackendError})
 * lives in `neocom-domain`; this file only lists this app's codes / messages / statuses.
 */
export const ExceptionCatalog = {
  INVALID_PILOT_ID: catalogEntry(
    'INVALID_REQUEST',
    '{0} must be an integer.',
    HttpStatus.BAD_REQUEST,
  ),

  /** Generic 404 — pass the description as `{0}`; payload names what was missing. */
  NOT_FOUND: catalogEntry('NOT_FOUND', '{0}', HttpStatus.NOT_FOUND),

  PILOT_SOURCE_UNAVAILABLE: catalogEntry(
    'INTERNAL_SERVER_ERROR',
    'The pilot source is not available.',
    HttpStatus.INTERNAL_SERVER_ERROR,
  ),

  ESI_INDUSTRY_UNAVAILABLE: catalogEntry(
    'INTERNAL_SERVER_ERROR',
    'ESI industry source is not available.',
    HttpStatus.INTERNAL_SERVER_ERROR,
  ),

  SSO_STATE_MISMATCH: catalogEntry(
    'SSO_STATE_MISMATCH',
    'The request state does not match. Caller not verified.',
    HttpStatus.BAD_REQUEST,
  ),

  TOKEN_UNAVAILABLE: catalogEntry(
    'TOKEN_UNAVAILABLE',
    'The access token could not be replaced.',
    HttpStatus.UNAUTHORIZED,
  ),
} as const;
