/**
 * Base for back ↔ front interchange DTOs.
 * Owns `jsonClass` and field-assign construction (moved from `neocom-domain` for *Dto flows — BLP-028).
 */
export class Record {
  public jsonClass: string = 'Record';

  constructor(fields: object = {}) {
    Object.assign(this, fields);
  }

  getJsonClass(): string {
    return this.jsonClass;
  }
}
