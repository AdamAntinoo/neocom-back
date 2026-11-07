import { describe, expect, it, vi } from 'vitest';
import { NeocomBackendError } from 'neocom-domain';
import type { PilotAssetInstance } from '@Domain/ports/pilot-assets.port.js';
import type { AccessCookieValue } from '@Infra/adapters/services/auth-cookies.service.js';
import { EveAssetV1Dto } from '@Infra/adapters/inbound/dto/eve-asset-v1.dto.js';
import { LocatedAssetContainerV1Dto } from '@Infra/adapters/inbound/dto/located-asset-container-v1.dto.js';
import { EveLocationV1Dto } from '@Infra/adapters/inbound/dto/eve-location-v1.dto.js';
import { PricedItemV1Dto } from '@Infra/adapters/inbound/dto/priced-item-v1.dto.js';
import { EveItemV1Dto } from '@Infra/adapters/inbound/dto/eve-item-v1.dto.js';
import {
  GetPilotAssetsUseCase,
  nestContainers,
} from './get-pilot-assets.usecase.js';

const auth: AccessCookieValue = {
  accessToken: 'tok',
  characterName: 'Pilot',
  characterId: 42,
};

function priced(typeId: number): PricedItemV1Dto {
  return new PricedItemV1Dto({
    typeId,
    name: `T${typeId}`,
    buyPrice: 1,
    sellPrice: 2,
    marketHub: new EveLocationV1Dto({ locationId: 60003760 }),
  });
}

describe('nestContainers', () => {
  it('hangs location_type=item children under LocatedAssetContainerV1Dto', () => {
    const parent = new EveAssetV1Dto({
      itemId: 10,
      typeId: 620,
      locationId: 60003760,
      locationType: 'station',
      item: priced(620),
    });
    const child = new EveAssetV1Dto({
      itemId: 11,
      typeId: 38,
      locationId: 10,
      locationType: 'item',
      item: priced(38),
    });
    const roots = nestContainers([parent, child]);
    expect(roots).toHaveLength(1);
    expect(roots[0]).toBeInstanceOf(LocatedAssetContainerV1Dto);
    const container = roots[0] as LocatedAssetContainerV1Dto;
    expect(container.contents).toHaveLength(1);
    expect(container.contents[0].itemId).toBe(11);
  });
});

describe('GetPilotAssetsUseCase', () => {
  const instances: PilotAssetInstance[] = [
    {
      itemId: 10,
      typeId: 620,
      quantity: 1,
      locationId: 60003760,
      locationType: 'station',
      locationFlag: 'Hangar',
      isSingleton: true,
      ownerPilotId: 42,
    },
    {
      itemId: 11,
      typeId: 38,
      quantity: 200,
      locationId: 10,
      locationType: 'item',
      locationFlag: 'AutoFit',
      isSingleton: false,
      ownerPilotId: 42,
    },
  ];

  it('rejects unauthenticated callers', async () => {
    const uc = new GetPilotAssetsUseCase(
      { findAssetsByPilotId: vi.fn() },
      { get: vi.fn(), set: vi.fn() },
      { execute: vi.fn() } as never,
      { execute: vi.fn() } as never,
      { execute: vi.fn() } as never,
    );
    await expect(uc.execute(42, null)).rejects.toBeInstanceOf(NeocomBackendError);
  });

  it('returns cache hit without ESI', async () => {
    const cached = [new EveAssetV1Dto({ itemId: 1, typeId: 34, item: priced(34) })];
    const port = { findAssetsByPilotId: vi.fn() };
    const cache = { get: vi.fn().mockResolvedValue(cached), set: vi.fn() };
    const uc = new GetPilotAssetsUseCase(
      port,
      cache,
      { execute: vi.fn() } as never,
      { execute: vi.fn() } as never,
      { execute: vi.fn() } as never,
    );
    const result = await uc.execute(42, auth);
    expect(result).toBe(cached);
    expect(port.findAssetsByPilotId).not.toHaveBeenCalled();
  });

  it('expands, nests, write-through caches, and filters by location', async () => {
    const port = { findAssetsByPilotId: vi.fn().mockResolvedValue(instances) };
    const cache = { get: vi.fn().mockResolvedValue(undefined), set: vi.fn() };
    const getPriced = {
      execute: vi.fn().mockImplementation((typeId: number) => Promise.resolve(priced(typeId))),
    };
    const getEveItem = { execute: vi.fn() };
    const getLocation = {
      execute: vi.fn().mockResolvedValue({
        jsonClass: 'SpaceLocation',
        locationType: 'STATION',
        locationId: 60003760,
        stationId: 60003760,
        stationName: 'Jita 4-4',
      }),
    };
    const uc = new GetPilotAssetsUseCase(
      port,
      cache,
      getPriced as never,
      getEveItem as never,
      getLocation as never,
    );

    const roots = await uc.execute(42, auth);
    expect(roots).toHaveLength(1);
    expect(roots[0]).toBeInstanceOf(LocatedAssetContainerV1Dto);
    expect(cache.set).toHaveBeenCalled();

    cache.get.mockResolvedValue(roots);
    const filtered = await uc.executeForLocation(42, 60003760, auth);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].locationId).toBe(60003760);

    const empty = await uc.executeForLocation(42, 999, auth);
    expect(empty).toHaveLength(0);
  });

  it('falls back to EveItem when hub price is missing', async () => {
    const port = {
      findAssetsByPilotId: vi.fn().mockResolvedValue([instances[0]]),
    };
    const cache = { get: vi.fn().mockResolvedValue(undefined), set: vi.fn() };
    const getPriced = {
      execute: vi.fn().mockRejectedValue(
        new NeocomBackendError(404, [{ code: 'MARKET_PRICE_NOT_FOUND', description: 'x' }]),
      ),
    };
    const getEveItem = {
      execute: vi.fn().mockResolvedValue(
        new EveItemV1Dto({ typeId: 620, name: 'Ship', description: '', published: true, groupId: 1 }),
      ),
    };
    const getLocation = {
      execute: vi.fn().mockResolvedValue({
        jsonClass: 'SpaceLocation',
        locationType: 'STATION',
        locationId: 60003760,
      }),
    };
    const uc = new GetPilotAssetsUseCase(
      port,
      cache,
      getPriced as never,
      getEveItem as never,
      getLocation as never,
    );
    const roots = await uc.execute(42, auth);
    expect(roots[0].item.typeId).toBe(620);
    expect(getEveItem.execute).toHaveBeenCalled();
  });
});
