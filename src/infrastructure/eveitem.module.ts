import { Module } from '@nestjs/common';
import { GetEveItemByIdUseCase } from '@App/use-cases/get-eve-item-by-id.usecase.js';
import { GetPricedItemByIdUseCase } from '@App/use-cases/get-priced-item-by-id.usecase.js';
import { UNIVERSE_TYPE_CACHE } from '@Domain/ports/universe-type-cache.port.js';
import { UNIVERSE_TYPE_SOURCE } from '@Domain/ports/universe-type-source.port.js';
import { MARKET_HUB_PRICE } from '@Domain/ports/market-hub-price.port.js';
import { MARKET_PRICE_CACHE } from '@Domain/ports/market-price-cache.port.js';
import { RedisMarketPriceCache } from '@Infra/adapters/outbound/persistence/redis-market-price-cache.adapter.js';
import { RedisUniverseTypeCache } from '@Infra/adapters/outbound/persistence/redis-universe-type-cache.adapter.js';
import { JitaMarketHubPriceAdapter } from '@Infra/adapters/outbound/market/jita-market-hub-price.adapter.js';
import { EsiUniverseTypeSource } from '@Infra/adapters/outbound/universe/esi-universe-type-source.adapter.js';

@Module({
  providers: [
    GetEveItemByIdUseCase,
    GetPricedItemByIdUseCase,
    RedisUniverseTypeCache,
    { provide: UNIVERSE_TYPE_CACHE, useExisting: RedisUniverseTypeCache },
    RedisMarketPriceCache,
    { provide: MARKET_PRICE_CACHE, useExisting: RedisMarketPriceCache },
    EsiUniverseTypeSource,
    { provide: UNIVERSE_TYPE_SOURCE, useExisting: EsiUniverseTypeSource },
    JitaMarketHubPriceAdapter,
    { provide: MARKET_HUB_PRICE, useExisting: JitaMarketHubPriceAdapter },
  ],
  exports: [GetEveItemByIdUseCase, GetPricedItemByIdUseCase],
})
export class EveItemModule {}
