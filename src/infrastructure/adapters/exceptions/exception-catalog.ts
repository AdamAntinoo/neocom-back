import { HttpStatus } from '@nestjs/common';
import { catalogEntry } from 'neocom-domain';

/**
 * Back-specific named exception catalog.
 * Each entry is **code + parametrized message + HTTP status** (neocom-domain `catalogEntry`).
 * Payload (`field` / `container` / `value`) is supplied at throw time via the payload builder.
 */
export const ExceptionCatalog = {
  INVALID_PILOT_ID: catalogEntry(
    'INVALID_REQUEST',
    '{0} must be an integer.',
    HttpStatus.BAD_REQUEST,
  ),

  PILOT_NOT_FOUND: catalogEntry(
    'PILOT_NOT_FOUND',
    'No pilot exists for identifier {0}.',
    HttpStatus.NOT_FOUND,
  ),

  BLUEPRINTS_NOT_FOUND: catalogEntry(
    'BLUEPRINTS_NOT_FOUND',
    'No blueprints for pilot id {0}.',
    HttpStatus.NOT_FOUND,
  ),

  STORED_CHARACTERS_NOT_FOUND: catalogEntry(
    'STORED_CHARACTERS_NOT_FOUND',
    'No characters in tokens.json — log in via the front first.',
    HttpStatus.NOT_FOUND,
  ),

  STORED_CHARACTER_NOT_FOUND: catalogEntry(
    'STORED_CHARACTER_NOT_FOUND',
    'No stored character for id {0}.',
    HttpStatus.NOT_FOUND,
  ),

  ENDPOINT_NOT_FOUND: catalogEntry(
    'ENDPOINT_NOT_FOUND',
    'No resource at {0}.',
    HttpStatus.NOT_FOUND,
  ),

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

  LOCATION_NOT_FOUND: catalogEntry(
    'LOCATION_NOT_FOUND',
    'No SpaceLocation catalog entry for id {0}.',
    HttpStatus.NOT_FOUND,
  ),

  EVE_ITEM_NOT_FOUND: catalogEntry(
    'EVE_ITEM_NOT_FOUND',
    'No EveItemV1Dto for item id {0}.',
    HttpStatus.NOT_FOUND,
  ),

  MARKET_PRICE_NOT_FOUND: catalogEntry(
    'MARKET_PRICE_NOT_FOUND',
    'No hub price data for item id {0}.',
    HttpStatus.NOT_FOUND,
  ),

  PRICED_ITEM_AUTH_REQUIRED: catalogEntry(
    'UNAUTHORIZED',
    'Access cookie / session is required to get priced EveItem id {0}.',
    HttpStatus.UNAUTHORIZED,
  ),

  /** Structure id range requires authenticated ESI via the access cookie (LOC-135). */
  LOCATION_AUTH_REQUIRED: catalogEntry(
    'UNAUTHORIZED',
    'Authenticated ESI is required to resolve structure id {0}.',
    HttpStatus.UNAUTHORIZED,
  ),

  /** ESI refused access to the location (typically structure 403). */
  LOCATION_FORBIDDEN: catalogEntry(
    'FORBIDDEN',
    'ESI forbids access to location id {0}.',
    HttpStatus.FORBIDDEN,
  ),

  ASSETS_AUTH_REQUIRED: catalogEntry(
    'UNAUTHORIZED',
    'Access cookie / session is required to get assets for pilot id {0}.',
    HttpStatus.UNAUTHORIZED,
  ),

  ASSETS_NOT_FOUND: catalogEntry(
    'ASSETS_NOT_FOUND',
    'No assets for pilot id {0}.',
    HttpStatus.NOT_FOUND,
  ),

  ESI_ASSETS_UNAVAILABLE: catalogEntry(
    'INTERNAL_SERVER_ERROR',
    'ESI assets source is not available.',
    HttpStatus.INTERNAL_SERVER_ERROR,
  ),
} as const;
