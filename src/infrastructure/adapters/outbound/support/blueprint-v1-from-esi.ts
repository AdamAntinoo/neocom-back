import { BlueprintV1 } from 'neocom-domain';

/** ESI character blueprint row (subset used for mapping; detailed map TBD BACK-SVC-072). */
export interface EsiBlueprintRow {
  item_id: number;
  type_id: number;
  location_id: number;
  location_flag: string;
  quantity: number;
  time_efficiency: number;
  material_efficiency: number;
  runs: number;
}

/** Map ESI blueprint row → published domain {@link BlueprintV1}. */
export function blueprintV1FromEsi(row: EsiBlueprintRow): BlueprintV1 {
  return new BlueprintV1({
    blueprintId: row.item_id,
    blueprintTypeId: row.type_id,
    blueprintTypeName: '',
    // Model-only / SDE enrichment deferred (BACK-SVC-072 review).
    outputTypeId: 0,
    outputTypeName: '',
    runs: row.runs,
    materialEfficiency: row.material_efficiency,
    timeEfficiency: row.time_efficiency,
    // ESI quantity: negative codes for BPO/BPC; positive used as maxRuns when present.
    maxRuns: row.quantity > 0 ? row.quantity : 0,
  });
}
