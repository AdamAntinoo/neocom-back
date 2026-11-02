import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { EsiClient, isNetworkError, isNotFound, isServerError } from '@lgriffin/esi.ts';
import { type BlueprintV1, type IndustryPort } from 'neocom-domain';
import {
  ExceptionCatalog,
  exceptionPayload,
} from '@Infra/adapters/exceptions/index.js';
import {
  blueprintV1FromEsi,
  type EsiBlueprintRow,
} from '@Infra/adapters/outbound/support/blueprint-v1-from-esi.js';

/** ESI surface used by the industry outbound adapter (initial: character blueprints). */
export interface EsiIndustryApi {
  characters: {
    getCharacterBlueprints(characterId: number): Promise<EsiBlueprintRow[]>;
  };
}

@Injectable()
export class EsiIndustryAdapter implements IndustryPort, OnModuleDestroy {
  private readonly esi = new EsiClient({ clientId: 'neocom-back' });

  getPilotBlueprints(pilotId: number): Promise<BlueprintV1[]> {
    return readPilotBlueprintsFromEsi(this.esi, pilotId);
  }

  onModuleDestroy(): void {
    this.esi.shutdown();
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
    if (isNetworkError(error) || isServerError(error)) {
      throw ExceptionCatalog.ESI_INDUSTRY_UNAVAILABLE.doThrow(
        exceptionPayload().field('pilotId').container('path').value(String(pilotId)).build(),
      );
    }
    throw error;
  }
}
