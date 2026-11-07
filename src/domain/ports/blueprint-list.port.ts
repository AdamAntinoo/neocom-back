export const BLUEPRINT_LIST = Symbol('BLUEPRINT_LIST');

/** Wire item for manufacture blueprint list (async enrichment). */
export type BlueprintListItem = {
  jsonClass: 'ProcessedBlueprint';
  blueprintId: number;
  name: string;
  ready: boolean;
  manufactureIndex: number | null;
  marketCost: number | null;
  manufactureCost: number | null;
};

/**
 * Outbound port for pilot manufacture blueprint list (persistence + ESI miss path).
 * Enrichment push is {@link NodeEnricher} on the same adapter.
 */
export interface BlueprintListPort {
  scopeKey(pilotId: number): string;
  getList(pilotId: number): Promise<BlueprintListItem[]>;
}
