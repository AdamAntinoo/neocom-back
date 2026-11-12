import { describe, expect, it, vi } from 'vitest';
import type { MarketHubPricePort } from '@Domain/ports/market-hub-price.port.js';
import { EveItemV1Dto } from '@Infra/adapters/inbound/dto/eve-item-v1.dto.js';
import { EveLocationV1Dto } from '@Infra/adapters/inbound/dto/eve-location-v1.dto.js';
import type { AccessCookieValue } from '@Infra/adapters/services/auth-cookies.service.js';
import { NeocomBackendError } from 'neocom-domain';
import { GetEveItemByIdUseCase } from './get-eve-item-by-id.usecase.js';
import { GetPricedItemByIdUseCase } from './get-priced-item-by-id.usecase.js';

describe('GetPricedItemByIdUseCase', () => {
  const auth: AccessCookieValue = {
    accessToken: 't',
    characterName: 'Pilot',
    characterId: 1,
  };
  const item = new EveItemV1Dto({
    typeId: 34,
    name: 'Tritanium',
    description: '…',
    published: true,
    groupId: 18,
  });
  const hub = new EveLocationV1Dto({
    locationType: 'STATION',
    locationId: 60003760,
    marketHub: true,
  });

  it('rejects unauthenticated callers (ITEM-021)', async () => {
    const getEve = { execute: vi.fn() } as unknown as GetEveItemByIdUseCase;
    const prices: MarketHubPricePort = { searchPricesForType: vi.fn() };
    const uc = new GetPricedItemByIdUseCase(getEve, prices);

    await expect(uc.execute(34, null)).rejects.toMatchObject({
      errors: [expect.objectContaining({ code: 'UNAUTHORIZED' })],
    });
    expect(getEve.execute).not.toHaveBeenCalled();
  });

  it('composes GetEveItemById then attaches hub prices (ITEM-015 / ITEM-019)', async () => {
    const getEve = {
      execute: vi.fn().mockResolvedValue(item),
    } as unknown as GetEveItemByIdUseCase;
    const prices: MarketHubPricePort = {
      searchPricesForType: vi.fn().mockResolvedValue({
        buyPrice: 5.1,
        sellPrice: 5.4,
        marketHub: hub,
      }),
    };
    const uc = new GetPricedItemByIdUseCase(getEve, prices);

    const priced = await uc.execute(34, auth);
    expect(getEve.execute).toHaveBeenCalledWith(34);
    expect(prices.searchPricesForType).toHaveBeenCalledWith(34);
    expect(priced).toMatchObject({
      jsonClass: 'PricedItemV1Dto',
      typeId: 34,
      name: 'Tritanium',
      buyPrice: 5.1,
      sellPrice: 5.4,
    });
    expect(priced.marketHub.locationId).toBe(60003760);
  });

  it('throws when hub prices are missing', async () => {
    const getEve = {
      execute: vi.fn().mockResolvedValue(item),
    } as unknown as GetEveItemByIdUseCase;
    const prices: MarketHubPricePort = {
      searchPricesForType: vi.fn().mockResolvedValue(undefined),
    };
    const uc = new GetPricedItemByIdUseCase(getEve, prices);

    await expect(uc.execute(34, auth)).rejects.toBeInstanceOf(
      NeocomBackendError,
    );
    await expect(uc.execute(34, auth)).rejects.toMatchObject({
      errors: [expect.objectContaining({ code: 'MARKET_PRICE_NOT_FOUND' })],
    });
  });
});
