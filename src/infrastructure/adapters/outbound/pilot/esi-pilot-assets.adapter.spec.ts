import { describe, expect, it, vi } from 'vitest';
import {
  EsiConfigurationError,
  EsiError,
  EsiNetworkError,
} from '@lgriffin/esi.ts';
import { NeocomBackendError } from 'neocom-domain';
import {
  EsiPilotAssetsAdapter,
  readPilotAssetsFromEsi,
} from './esi-pilot-assets.adapter.js';

function assetsEsi(
  getCharacterAssets: () => Promise<unknown>,
  postCharacterAssetNames: () => Promise<unknown> = () => Promise.resolve([]),
) {
  return {
    assets: {
      getCharacterAssets: vi.fn(getCharacterAssets),
      postCharacterAssetNames: vi.fn(postCharacterAssetNames),
    },
  };
}

describe('readPilotAssetsFromEsi', () => {
  it('maps ESI rows and joins names by item_id (omits literal None)', async () => {
    const esi = assetsEsi(
      () =>
        Promise.resolve([
          {
            item_id: 1,
            type_id: 34,
            quantity: 10,
            location_id: 60003760,
            location_type: 'station',
            location_flag: 'Hangar',
            is_singleton: false,
          },
          {
            item_id: 2,
            type_id: 38,
            quantity: 1,
            location_id: 60003760,
            location_type: 'station',
            location_flag: 'Hangar',
            is_singleton: true,
            is_blueprint_copy: true,
          },
        ]),
      () =>
        Promise.resolve([
          { item_id: 1, name: 'None' },
          { item_id: 2, name: 'Prisas' },
        ]),
    );

    const rows = await readPilotAssetsFromEsi(esi, 42);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBeUndefined();
    expect(rows[1]).toMatchObject({
      itemId: 2,
      name: 'Prisas',
      isBlueprintCopy: true,
      ownerPilotId: 42,
    });
    expect(esi.assets.postCharacterAssetNames).toHaveBeenCalledWith(42, [1, 2]);
  });

  it('skips name lookup when the asset list is empty', async () => {
    const esi = assetsEsi(() => Promise.resolve([]));
    expect(await readPilotAssetsFromEsi(esi, 1)).toEqual([]);
    expect(esi.assets.postCharacterAssetNames).not.toHaveBeenCalled();
  });

  it('maps not-found to ASSETS_NOT_FOUND', async () => {
    const esi = assetsEsi(() => Promise.reject(new EsiError(404, 'missing')));
    await expect(readPilotAssetsFromEsi(esi, 7)).rejects.toMatchObject({
      errors: [expect.objectContaining({ code: 'ASSETS_NOT_FOUND' })],
    });
  });

  it('maps unauthorized and config errors to TOKEN_UNAVAILABLE', async () => {
    const unauthorized = assetsEsi(() =>
      Promise.reject(new EsiError(401, 'nope')),
    );
    await expect(readPilotAssetsFromEsi(unauthorized, 1)).rejects.toMatchObject(
      {
        errors: [expect.objectContaining({ code: 'TOKEN_UNAVAILABLE' })],
      },
    );

    const config = assetsEsi(() =>
      Promise.reject(new EsiConfigurationError('NO_AUTH_TOKEN', 'missing')),
    );
    await expect(readPilotAssetsFromEsi(config, 1)).rejects.toBeInstanceOf(
      NeocomBackendError,
    );
  });

  it('maps network and server errors via ESI_ASSETS_UNAVAILABLE', async () => {
    const network = assetsEsi(() =>
      Promise.reject(new EsiNetworkError('reset', '/assets/')),
    );
    await expect(readPilotAssetsFromEsi(network, 1)).rejects.toMatchObject({
      errors: [
        expect.objectContaining({
          code: 'INTERNAL_SERVER_ERROR',
          description: 'ESI assets source is not available.',
        }),
      ],
    });

    const server = assetsEsi(() => Promise.reject(new EsiError(503, 'down')));
    await expect(readPilotAssetsFromEsi(server, 1)).rejects.toMatchObject({
      errors: [expect.objectContaining({ code: 'INTERNAL_SERVER_ERROR' })],
    });
  });

  it('rethrows unexpected errors', async () => {
    const esi = assetsEsi(() => Promise.reject(new Error('weird')));
    await expect(readPilotAssetsFromEsi(esi, 1)).rejects.toThrow('weird');
  });
});

describe('EsiPilotAssetsAdapter', () => {
  it('creates a client once, reuses it, and shuts down on destroy', async () => {
    const client = {
      shutdown: vi.fn(),
      assets: {
        getCharacterAssets: vi.fn().mockResolvedValue([]),
        postCharacterAssetNames: vi.fn(),
      },
    };
    const tokens = {
      createClient: vi.fn().mockResolvedValue(client),
    };
    const adapter = new EsiPilotAssetsAdapter(tokens as never);

    expect(await adapter.findAssetsByPilotId(9)).toEqual([]);
    expect(await adapter.findAssetsByPilotId(9)).toEqual([]);
    expect(tokens.createClient).toHaveBeenCalledTimes(1);

    await adapter.onModuleDestroy();
    expect(client.shutdown).toHaveBeenCalled();
  });

  it('maps token manager failures to TOKEN_UNAVAILABLE', async () => {
    const tokens = {
      createClient: vi.fn().mockRejectedValue(new Error('no token')),
    };
    const adapter = new EsiPilotAssetsAdapter(tokens as never);
    await expect(adapter.findAssetsByPilotId(1)).rejects.toMatchObject({
      errors: [expect.objectContaining({ code: 'TOKEN_UNAVAILABLE' })],
    });
  });
});
