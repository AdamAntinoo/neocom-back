export interface AllianceV1 {
  allianceId?: number;
  name?: string;
  ticker?: string;
  url4Icon?: string;
}

export interface Station {}

export interface PublicCorporationV1 {
  corporationId?: number;
  name?: string;
  ceoid?: number;
  creatorId?: number;
  dateFounded?: string;
  description?: string;
  homeStation?: Station;
  memberCount?: number;
  shares?: number;
  taxRate?: number;
  ticker?: string;
  url4Icon?: string;
  allianceId?: number;
  alliance?: AllianceV1;
}

export interface UniverseRaceData {
  allianceId?: number;
  description?: string;
  name?: string;
  raceId?: number;
}

export interface UniverseAncestryData {
  name?: string;
}

export interface UniverseBloodlineData {
  name?: string;
}

export interface SpaceLocationV1 {}

export interface PublicPilotV1 {
  pilotId: number;
  name?: string;
  corporation?: PublicCorporationV1;
  birthday?: string;
  description?: string;
  gender?: string;
  securityStatus?: number;
  url4Icon?: string;
  raceData?: UniverseRaceData;
  ancestryData?: UniverseAncestryData;
  bloodlineData?: UniverseBloodlineData;
}

export interface PilotV2 extends PublicPilotV1 {
  totalSkillpoints?: number;
  walletBalance?: number;
  currentShipName?: string;
  currentShipTypeName?: string;
  lastKnownLocation?: SpaceLocationV1;
}
