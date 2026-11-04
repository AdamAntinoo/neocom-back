/** Access credentials carried from the request cookie for authenticated ESI (LOC-135). */
export interface LocationAuth {
  accessToken: string;
  characterName: string;
  characterId: number;
}
