export type ProcessedNodeRecord = {
  scopeKey: string;
  nodeId: string;
  simplified: Record<string, unknown>;
  calculated: Record<string, unknown>;
  ready: boolean;
  updatedAt: Date;
  staleAfter: Date | null;
};

export abstract class ProcessedNodeStore {
  abstract listByScope(scopeKey: string): Promise<ProcessedNodeRecord[]>;
  abstract upsertItem(record: Omit<ProcessedNodeRecord, 'updatedAt'> & { updatedAt?: Date }): Promise<ProcessedNodeRecord>;
  abstract queryIncompleteOrStale(scopeKey: string, now?: Date): Promise<ProcessedNodeRecord[]>;
}
