import { Record } from './record.js';
import type { SpaceLocationV1Dto } from './space-location-v1.dto.js';

/**
 * Back ↔ front interchange for a pilot blueprint (BLP-018 / BLP-020).
 * Owned by neocom-back under `infrastructure/adapters/dto` (BLP-026). Extends {@link Record} (BLP-028).
 */
export class BlueprintV1Dto extends Record {
  override jsonClass: string = 'BlueprintV1Dto';
  blueprintId = 0;
  blueprintTypeId = 0;
  blueprintTypeName = '';
  blueprintTypeIconURL = '';
  outputTypeId = 0;
  outputTypeName = '';
  outputTypeIconURL = '';
  runs = 0;
  materialEfficiency = 0;
  timeEfficiency = 0;
  maxRuns = 0;
  /** ESI `location_id` — used for catalog lookup (BLP-014). */
  locationId = 0;
  /** ESI `location_flag` (BLP-014). */
  locationFlag = '';
  /** Catalog-resolved location when lookup succeeds (BLP-015 / BLP-019). */
  location?: SpaceLocationV1Dto;

  constructor(values: Partial<BlueprintV1Dto> = {}) {
    super(values);
    Object.assign(this, values);
    this.jsonClass = 'BlueprintV1Dto';
    this.materialEfficiency = clamp(this.materialEfficiency, 0, 10);
    this.timeEfficiency = clamp(this.timeEfficiency, 0, 20);
    if (!this.blueprintTypeIconURL && this.blueprintTypeId > 0) {
      this.blueprintTypeIconURL = `https://images.evetech.net/types/${this.blueprintTypeId}/bp`;
    }
    if (!this.outputTypeIconURL && this.outputTypeId > 0) {
      this.outputTypeIconURL = `https://images.evetech.net/types/${this.outputTypeId}/icon`;
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}
