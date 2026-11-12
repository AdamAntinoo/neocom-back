import { Injectable } from '@nestjs/common';
import {
  ProcessedNodeRecord,
  ProcessedNodeStore,
} from '@Domain/ports/processed-node.store.js';

@Injectable()
export class InMemoryProcessedNodeStore extends ProcessedNodeStore {
  private readonly byScope = new Map<
    string,
    Map<string, ProcessedNodeRecord>
  >();

  async listByScope(scopeKey: string): Promise<ProcessedNodeRecord[]> {
    const scope = this.byScope.get(scopeKey);
    return scope ? [...scope.values()] : [];
  }

  async upsertItem(
    record: Omit<ProcessedNodeRecord, 'updatedAt'> & { updatedAt?: Date },
  ): Promise<ProcessedNodeRecord> {
    let scope = this.byScope.get(record.scopeKey);
    if (!scope) {
      scope = new Map();
      this.byScope.set(record.scopeKey, scope);
    }
    const saved: ProcessedNodeRecord = {
      ...record,
      updatedAt: record.updatedAt ?? new Date(),
    };
    scope.set(record.nodeId, saved);
    return saved;
  }

  async queryIncompleteOrStale(
    scopeKey: string,
    now: Date = new Date(),
  ): Promise<ProcessedNodeRecord[]> {
    const list = await this.listByScope(scopeKey);
    return list.filter(
      (r) => !r.ready || (r.staleAfter != null && r.staleAfter <= now),
    );
  }
}
