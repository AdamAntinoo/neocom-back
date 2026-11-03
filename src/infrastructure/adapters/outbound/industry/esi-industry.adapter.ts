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
import { type BlueprintV1, type IndustryPort } from 'neocom-domain';
import {
  ExceptionCatalog,
  exceptionPayload,
} from '@Infra/adapters/exceptions/index.js';
import { ESI_TOKEN_MANAGER } from '@Infra/auth/esi-token-manager.provider.js';
import {
  blueprintV1FromEsi,
  type EsiBlueprintRow,
} from '@Infra/adapters/outbound/support/blueprint-v1-from-esi.js';

const ESI_USER_AGENT = 'neocom-back/0.1.0 (AdamAntinoo; https://github.com/AdamAntinoo/neocom-back)';

/** ESI surface used by the industry outbound adapter (initial: character blueprints). */
export interface EsiIndustryApi {
  characters: {
    getCharacterBlueprints(characterId: number): Promise<EsiBlueprintRow[]>;
  };
  setAccessToken?(token: string): void;
  setTokenProvider?(provider: (() => Promise<string>) | undefined): void;
}

@Injectable()
export class EsiIndustryAdapter implements IndustryPort, OnModuleDestroy {
  private readonly clients = new Map<number, EsiClient>();

  constructor(@Inject(ESI_TOKEN_MANAGER) private readonly tokens: EsiTokenManager) {}

  async getPilotBlueprints(pilotId: number): Promise<BlueprintV1[]> {
    const esi = await this.clientFor(pilotId);
    return readPilotBlueprintsFromEsi(esi, pilotId);
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
      const client = await this.tokens.createClient(pilotId, { userAgent: ESI_USER_AGENT });
      this.clients.set(pilotId, client);
      return client;
    } catch {
      throw ExceptionCatalog.TOKEN_UNAVAILABLE.doThrow();
    }
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

export async function readPilotBlueprintsFromEsi(
  esi: EsiIndustryApi,
  pilotId: number,
): Promise<BlueprintV1[]> {
  try {
    const rows = await esi.characters.getCharacterBlueprints(pilotId);
    return rows.map((row) => blueprintV1FromEsi(row));
  } catch (error) {
    if (isNotFound(error)) {
      throw ExceptionCatalog.NOT_FOUND.doThrow(
        `No blueprints for pilot id ${pilotId}.`,
        exceptionPayload().field('pilotId').container('path').value(String(pilotId)).build(),
      );
    }
    if (isUnauthorized(error) || isAuthError(error) || isConfigurationError(error)) {
      throw ExceptionCatalog.TOKEN_UNAVAILABLE.doThrow();
    }
    if (isNetworkError(error) || isServerError(error)) {
      throw ExceptionCatalog.ESI_INDUSTRY_UNAVAILABLE.doThrow(
        exceptionPayload().field('pilotId').container('path').value(String(pilotId)).build(),
      );
    }
    throw error;
  }
}
