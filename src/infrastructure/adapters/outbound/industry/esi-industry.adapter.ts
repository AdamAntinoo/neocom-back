import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  EsiClient,
  EsiTokenManager,
  isAuthError,
  isConfigurationError,
  isNetworkError,
  isNotFound,
  isServerError,
  isUnauthorized,
} from '@lgriffin/esi.ts';
import { BlueprintV1, type IndustryPort } from 'neocom-domain';
import type { BlueprintDtoLoader } from '@App/ports/blueprint-dto-loader.port.js';
import {
  ExceptionCatalog,
  exceptionPayload,
} from '@Infra/adapters/exceptions/index.js';
import { BlueprintV1Dto } from '@Infra/adapters/inbound/dto/blueprint-v1.dto.js';
import {
  EveItemDtoConverter,
  type EsiCharacterBlueprint,
} from '@Infra/adapters/inbound/converters/eve-item-dto.converter.js';
import { ESI_TOKEN_MANAGER } from '@Infra/auth/esi-token-manager.provider.js';
import { LayerLogger } from '@Infra/config/layer-logging.js';

const ESI_USER_AGENT =
  'neocom-back/0.1.0 (AdamAntinoo; https://github.com/AdamAntinoo/neocom-back)';
const log = LayerLogger.for('outbound', 'EsiIndustryAdapter');

/** ESI surface used by the industry outbound adapter (initial: character blueprints). */
export interface EsiIndustryApi {
  characters: {
    getCharacterBlueprints(
      characterId: number,
    ): Promise<EsiCharacterBlueprint[]>;
  };
  setAccessToken?(token: string): void;
  setTokenProvider?(provider: (() => Promise<string>) | undefined): void;
}

@Injectable()
export class EsiIndustryAdapter
  implements IndustryPort, BlueprintDtoLoader, OnModuleDestroy
{
  private readonly clients = new Map<number, EsiClient>();

  constructor(
    @Inject(ESI_TOKEN_MANAGER) private readonly tokens: EsiTokenManager,
  ) {}

  /** Legacy domain port — maps DTO path to {@link BlueprintV1} without a second ESI mapper. */
  async getPilotBlueprints(pilotId: number): Promise<BlueprintV1[]> {
    const dtos = await this.loadPilotBlueprintDtos(pilotId);
    return dtos.map(dtoToDomainBlueprintV1);
  }

  async loadPilotBlueprintDtos(pilotId: number): Promise<BlueprintV1Dto[]> {
    const esi = await this.clientFor(pilotId);
    return readPilotBlueprintDtosFromEsi(esi, pilotId);
  }

  async onModuleDestroy(): Promise<void> {
    for (const client of this.clients.values()) {
      client.shutdown();
    }
    this.clients.clear();
  }

  private async clientFor(pilotId: number): Promise<EsiClient> {
    const existing = this.clients.get(pilotId);
    if (existing) {
      return existing;
    }
    try {
      const client = await this.tokens.createClient(pilotId, {
        userAgent: ESI_USER_AGENT,
      });
      this.clients.set(pilotId, client);
    } catch {
      throw ExceptionCatalog.TOKEN_UNAVAILABLE.doThrow();
    }
    return this.clients.get(pilotId)!;
  }
}

/** Bind SSO access token for this pilot before authenticated ESI industry calls. */
export async function attachPilotAccessToken(
  esi: EsiIndustryApi,
  tokens: Pick<EsiTokenManager, 'getToken' | 'tokenProviderFor'>,
  pilotId: number,
): Promise<void> {
  try {
    const accessToken = await tokens.getToken(pilotId);
    esi.setAccessToken?.(accessToken);
    esi.setTokenProvider?.(tokens.tokenProviderFor(pilotId));
  } catch {
    throw ExceptionCatalog.TOKEN_UNAVAILABLE.doThrow();
  }
}

/** ESI character blueprints → {@link BlueprintV1Dto}[] (location fields retained; catalog embed is use-case). */
export async function readPilotBlueprintDtosFromEsi(
  esi: EsiIndustryApi,
  pilotId: number,
): Promise<BlueprintV1Dto[]> {
  try {
    const rows = await esi.characters.getCharacterBlueprints(pilotId);
    const dtos = rows.map((row) => EveItemDtoConverter.toBlueprintV1Dto(row));
    log.dtoConverted({
      from: 'EsiCharacterBlueprint[]',
      to: 'BlueprintV1Dto[]',
      count: dtos.length,
      ids: dtos.map((d) => d.blueprintId),
      fields: { pilotId },
    });
    return dtos;
  } catch (error) {
    if (isNotFound(error)) {
      throw ExceptionCatalog.BLUEPRINTS_NOT_FOUND.doThrow(
        String(pilotId),
        exceptionPayload()
          .field('pilotId')
          .container('path')
          .value(String(pilotId))
          .build(),
      );
    }
    if (
      isUnauthorized(error) ||
      isAuthError(error) ||
      isConfigurationError(error)
    ) {
      throw ExceptionCatalog.TOKEN_UNAVAILABLE.doThrow();
    }
    if (isNetworkError(error) || isServerError(error)) {
      throw ExceptionCatalog.ESI_INDUSTRY_UNAVAILABLE.doThrow(
        exceptionPayload()
          .field('pilotId')
          .container('path')
          .value(String(pilotId))
          .build(),
      );
    }
    throw error;
  }
}

/** Thin DTO → published domain model for {@link IndustryPort} only (not an ESI mapper). */
function dtoToDomainBlueprintV1(dto: BlueprintV1Dto): BlueprintV1 {
  return new BlueprintV1({
    blueprintId: dto.blueprintId,
    blueprintTypeId: dto.blueprintTypeId,
    blueprintTypeName: dto.blueprintTypeName,
    blueprintTypeIconURL: dto.blueprintTypeIconURL,
    outputTypeId: dto.outputTypeId,
    outputTypeName: dto.outputTypeName,
    outputTypeIconURL: dto.outputTypeIconURL,
    runs: dto.runs,
    materialEfficiency: dto.materialEfficiency,
    timeEfficiency: dto.timeEfficiency,
    maxRuns: dto.maxRuns,
  });
}
