import { EveAssetV1Dto } from './eve-asset-v1.dto.js';

/**
 * EveAsset that is in a location and contains other assets (AST-010…011).
 * On the wire, `contents` is a JSON array of nested asset / container objects.
 */
export class LocatedAssetContainerV1Dto extends EveAssetV1Dto {
  override jsonClass: string = 'LocatedAssetContainerV1Dto';
  contents: Array<EveAssetV1Dto | LocatedAssetContainerV1Dto> = [];

  constructor(values: Partial<LocatedAssetContainerV1Dto> = {}) {
    super(values);
    Object.assign(this, values);
    this.jsonClass = 'LocatedAssetContainerV1Dto';
    if (!Array.isArray(this.contents)) {
      this.contents = [];
    }
  }
}

/** Programme asset list element (flat asset or located container). */
export type PilotAssetNode = EveAssetV1Dto | LocatedAssetContainerV1Dto;
