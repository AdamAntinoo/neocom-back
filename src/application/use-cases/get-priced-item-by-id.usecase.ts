import { Inject, Injectable } from '@nestjs/common';
import {
  MARKET_HUB_PRICE,
  type MarketHubPricePort,
} from '@Domain/ports/market-hub-price.port.js';
import type { AccessCookieValue } from '@Infra/adapters/services/auth-cookies.service.js';
import { PricedItemV1Dto } from '@Infra/adapters/inbound/dto/priced-item-v1.dto.js';
import {
  ExceptionCatalog,
  exceptionPayload,
} from '@Infra/adapters/exceptions/index.js';
import { GetEveItemByIdUseCase } from './get-eve-item-by-id.usecase.js';

/**
 * Authenticated GetPricedItemById — composes GetEveItemById then hub price search (ITEM-015, 019, 021).
 */
@Injectable()
export class GetPricedItemByIdUseCase {
  constructor(
    private readonly getEveItemById: GetEveItemByIdUseCase,
    @Inject(MARKET_HUB_PRICE) private readonly prices: MarketHubPricePort,
  ) {}

  async execute(itemId: number, auth: AccessCookieValue | null): Promise<PricedItemV1Dto> {
    if (auth == null) {
      throw ExceptionCatalog.PRICED_ITEM_AUTH_REQUIRED.doThrow(
        itemId,
        exceptionPayload().field('cookie').container('header').value(String(itemId)).build(),
      );
    }

    const item = await this.getEveItemById.execute(itemId);
    const quote = await this.prices.searchPricesForType(itemId);
    if (!quote) {
      throw ExceptionCatalog.MARKET_PRICE_NOT_FOUND.doThrow(
        itemId,
        exceptionPayload().field('itemId').container('path').value(String(itemId)).build(),
      );
    }

    return PricedItemV1Dto.fromEveItem(item, quote.buyPrice, quote.sellPrice, quote.marketHub);
  }
}
