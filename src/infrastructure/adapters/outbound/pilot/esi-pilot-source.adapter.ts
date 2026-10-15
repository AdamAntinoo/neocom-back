import { HttpStatus, Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  EsiClient,
  isNetworkError,
  isNotFound,
  isServerError,
  type AllianceIcon,
  type AllianceInfo,
  type Ancestry,
  type Bloodline,
  type CharacterInfo,
  type CharacterPortrait,
  type CorporationInfo,
  type Race,
} from '@lgriffin/esi.ts';
import type { PilotSource } from '@App/ports/pilot-source.port.js';
import type { AllianceV1, PilotV2, PublicCorporationV1 } from '@Domain/pilot/pilot.js';
import { NeocomBackendError } from '@Infra/errors/neocom-backend.error.js';

type CorporationIcon = {
  px64x64?: string;
  px128x128?: string;
  px256x256?: string;
};

export interface EsiPilotApi {
  characters: {
    getCharacterPublicInfo(characterId: number): Promise<CharacterInfo>;
    getCharacterPortrait(characterId: number): Promise<CharacterPortrait>;
  };
  corporations: {
    getCorporationInfo(corporationId: number): Promise<CorporationInfo>;
    getCorporationIcon(corporationId: number): Promise<CorporationIcon>;
  };
  alliance: {
    getAllianceById(allianceId: number): Promise<AllianceInfo>;
    getIcons(allianceId: number): Promise<AllianceIcon>;
  };
  universe: {
    getRaces(): Promise<Race[]>;
    getAncestries(): Promise<Ancestry[]>;
    getBloodlines(): Promise<Bloodline[]>;
  };
}

@Injectable()
export class EsiPilotSource implements PilotSource, OnModuleDestroy {
  private readonly esi = new EsiClient({ clientId: 'neocom-back' });

  findById(pilotId: number): Promise<PilotV2> {
    return readPilotFromEsi(this.esi, pilotId);
  }

  onModuleDestroy(): void {
    this.esi.shutdown();
  }
}

export async function readPilotFromEsi(esi: EsiPilotApi, pilotId: number): Promise<PilotV2> {
  try {
    const info = await esi.characters.getCharacterPublicInfo(pilotId);
    const [portrait, corporation, races, ancestries, bloodlines] = await Promise.all([
      optional(() => esi.characters.getCharacterPortrait(pilotId)),
      readCorporation(esi, info.corporation_id, info.alliance_id),
      esi.universe.getRaces(),
      esi.universe.getAncestries(),
      esi.universe.getBloodlines(),
    ]);
    return toPilot(pilotId, info, portrait, corporation, races, ancestries, bloodlines);
  } catch (error) {
    if (isNotFound(error)) {
      throw new NeocomBackendError(HttpStatus.NOT_FOUND, [
        {
          code: 'PILOT_NOT_FOUND',
          description: 'No pilot exists for this identifier.',
          field: 'pilotId',
          container: 'path',
          value: String(pilotId),
        },
      ]);
    }
    if (isServerError(error) || isNetworkError(error)) {
      throw new NeocomBackendError(HttpStatus.INTERNAL_SERVER_ERROR, [
        {
          code: 'INTERNAL_SERVER_ERROR',
          description: 'The pilot source is not available.',
        },
      ]);
    }
    throw error;
  }
}

async function readCorporation(
  esi: EsiPilotApi,
  corporationId: number,
  characterAllianceId?: number,
): Promise<PublicCorporationV1> {
  const [info, icon] = await Promise.all([
    optional(() => esi.corporations.getCorporationInfo(corporationId)),
    optional(() => esi.corporations.getCorporationIcon(corporationId)),
  ]);
  const allianceId = info?.alliance_id ?? characterAllianceId;
  const alliance = allianceId === undefined ? undefined : await readAlliance(esi, allianceId);
  return {
    corporationId,
    ...(info === undefined
      ? {}
      : {
          name: info.name,
          ticker: info.ticker,
          description: info.description,
          ceoid: info.ceo_id,
          creatorId: info.creator_id,
          dateFounded: info.date_founded,
          memberCount: info.member_count,
          shares: info.shares,
          taxRate: info.tax_rate ?? info.tax_rates?.isk,
        }),
    ...(iconUrl(icon) === undefined ? {} : { url4Icon: iconUrl(icon) }),
    ...(allianceId === undefined ? {} : { allianceId }),
    ...(alliance === undefined ? {} : { alliance }),
  };
}

async function readAlliance(esi: EsiPilotApi, allianceId: number): Promise<AllianceV1 | undefined> {
  const [info, icon] = await Promise.all([
    optional(() => esi.alliance.getAllianceById(allianceId)),
    optional(() => esi.alliance.getIcons(allianceId)),
  ]);
  if (info === undefined && iconUrl(icon) === undefined) {
    return { allianceId };
  }
  return {
    allianceId,
    ...(info === undefined ? {} : { name: info.name, ticker: info.ticker }),
    ...(iconUrl(icon) === undefined ? {} : { url4Icon: iconUrl(icon) }),
  };
}

function toPilot(
  pilotId: number,
  info: CharacterInfo,
  portrait: CharacterPortrait | undefined,
  corporation: PublicCorporationV1,
  races: Race[],
  ancestries: Ancestry[],
  bloodlines: Bloodline[],
): PilotV2 {
  const race = races.find((item) => item.race_id === info.race_id);
  const ancestry = info.ancestry_id === undefined ? undefined : ancestries.find((item) => item.id === info.ancestry_id);
  const bloodline = bloodlines.find((item) => item.bloodline_id === info.bloodline_id);
  const portraitUrl = iconUrl(portrait);
  return {
    pilotId,
    name: info.name,
    description: info.description,
    birthday: info.birthday,
    gender: info.gender,
    securityStatus: info.security_status,
    ...(portraitUrl === undefined ? {} : { url4Icon: portraitUrl }),
    corporation,
    raceData: {
      raceId: info.race_id,
      ...(race === undefined
        ? {}
        : { name: race.name, description: race.description, allianceId: race.alliance_id }),
    },
    ...(ancestry === undefined ? {} : { ancestryData: { name: ancestry.name } }),
    ...(bloodline === undefined ? {} : { bloodlineData: { name: bloodline.name } }),
  };
}

function iconUrl(icon?: {
  px64x64?: string;
  px128x128?: string;
  px256x256?: string;
  px512x512?: string;
}): string | undefined {
  return icon?.px128x128 ?? icon?.px256x256 ?? icon?.px64x64 ?? icon?.px512x512;
}

async function optional<T>(load: () => Promise<T>): Promise<T | undefined> {
  try {
    return await load();
  } catch (error) {
    if (isNotFound(error)) {
      return undefined;
    }
    throw error;
  }
}
