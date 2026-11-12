import { describe, expect, it, vi } from 'vitest';
import { GetEveItemByIdUseCase } from '@App/use-cases/get-eve-item-by-id.usecase.js';
import { GetPricedItemByIdUseCase } from '@App/use-cases/get-priced-item-by-id.usecase.js';
import { GetSpaceLocationUseCase } from '@App/use-cases/get-space-location.usecase.js';
import { EveItemV1Dto } from '@Infra/adapters/inbound/dto/eve-item-v1.dto.js';
import { EveLocationV1Dto } from '@Infra/adapters/inbound/dto/eve-location-v1.dto.js';
import { PricedItemV1Dto } from '@Infra/adapters/inbound/dto/priced-item-v1.dto.js';
import { formatAccessCookie } from '@Infra/adapters/services/auth-cookies.service.js';
import { V1UniverseController } from './v1-universe.controller.js';

describe('V1UniverseController', () => {
  const space = { execute: vi.fn() } as unknown as GetSpaceLocationUseCase;
  const eve = { execute: vi.fn() } as unknown as GetEveItemByIdUseCase;
  const priced = { execute: vi.fn() } as unknown as GetPricedItemByIdUseCase;

  it('delegates spacelocations with parsed access cookie', async () => {
    const location = { locationId: 60008494, locationType: 'STATION' };
    (space.execute as ReturnType<typeof vi.fn>).mockResolvedValue(location);
    const controller = new V1UniverseController(space, eve, priced);
    const raw = formatAccessCookie({
      accessToken: 'tok',
      characterName: 'Pilot',
      characterId: 42,
    });

    await expect(
      controller.getSpaceLocationById(60008494, {
        cookies: { neocom_access: raw },
      } as never),
    ).resolves.toBe(location);
    expect(space.execute).toHaveBeenCalledWith(60008494, {
      accessToken: 'tok',
      characterName: 'Pilot',
      characterId: 42,
    });
  });

  it('delegates eveitems without auth (ITEM-017)', async () => {
    const item = new EveItemV1Dto({
      typeId: 34,
      name: 'Tritanium',
      published: true,
      groupId: 18,
    });
    (eve.execute as ReturnType<typeof vi.fn>).mockResolvedValue(item);
    const controller = new V1UniverseController(space, eve, priced);

    await expect(controller.getEveItemByIdPublic(34)).resolves.toBe(item);
    expect(eve.execute).toHaveBeenCalledWith(34);
  });

  it('delegates pricedeveitems with parsed access cookie (ITEM-020)', async () => {
    const body = PricedItemV1Dto.fromEveItem(
      new EveItemV1Dto({
        typeId: 34,
        name: 'Tritanium',
        published: true,
        groupId: 18,
      }),
      1,
      2,
      new EveLocationV1Dto({
        locationType: 'STATION',
        locationId: 60003760,
        marketHub: true,
      }),
    );
    (priced.execute as ReturnType<typeof vi.fn>).mockResolvedValue(body);
    const controller = new V1UniverseController(space, eve, priced);
    const raw = formatAccessCookie({
      accessToken: 'tok',
      characterName: 'Pilot',
      characterId: 42,
    });

    await expect(
      controller.getPricedEveItemById(34, {
        cookies: { neocom_access: raw },
      } as never),
    ).resolves.toBe(body);
    expect(priced.execute).toHaveBeenCalledWith(34, {
      accessToken: 'tok',
      characterName: 'Pilot',
      characterId: 42,
    });
  });

  it('passes null auth for pricedeveitems when cookie missing (ITEM-016 / ITEM-021)', async () => {
    (priced.execute as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('unauthorized'),
    );
    const controller = new V1UniverseController(space, eve, priced);

    await expect(
      controller.getPricedEveItemById(34, { cookies: {} } as never),
    ).rejects.toThrow();
    expect(priced.execute).toHaveBeenCalledWith(34, null);
  });
});
