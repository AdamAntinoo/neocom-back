/** Injection token (string — Nest ESM-safe; avoid Symbol here). */
export const NODE_ENRICHER = 'NODE_ENRICHER';

export interface NodeEnricher {
  enrichOne(scopeKey: string, nodeId: string): Promise<void>;
}
