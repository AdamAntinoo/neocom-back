import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import {
  ProcessedNodeRecord,
  ProcessedNodeStore,
} from '@Domain/ports/processed-node.store.js';
import { ProcessedNodeEntity } from './processed-node.entity.js';

@Injectable()
export class TypeOrmProcessedNodeStore extends ProcessedNodeStore {
  constructor(
    @InjectRepository(ProcessedNodeEntity)
    private readonly repo: Repository<ProcessedNodeEntity>,
  ) {
    super();
  }

  async listByScope(scopeKey: string): Promise<ProcessedNodeRecord[]> {
    const rows = await this.repo.find({ where: { scopeKey } });
    return rows.map(toRecord);
  }

  async upsertItem(
    record: Omit<ProcessedNodeRecord, 'updatedAt'> & { updatedAt?: Date },
  ): Promise<ProcessedNodeRecord> {
    let entity = await this.repo.findOne({
      where: { scopeKey: record.scopeKey, nodeId: record.nodeId },
    });
    if (!entity) {
      entity = this.repo.create({
        scopeKey: record.scopeKey,
        nodeId: record.nodeId,
      });
    }
    entity.simplified = record.simplified;
    entity.calculated = record.calculated;
    entity.ready = record.ready;
    entity.staleAfter = record.staleAfter;
    const saved = await this.repo.save(entity);
    return toRecord(saved);
  }

  async queryIncompleteOrStale(
    scopeKey: string,
    now: Date = new Date(),
  ): Promise<ProcessedNodeRecord[]> {
    const incomplete = await this.repo.find({
      where: { scopeKey, ready: false },
    });
    const stale = await this.repo.find({
      where: { scopeKey, staleAfter: LessThanOrEqual(now) },
    });
    const map = new Map<string, ProcessedNodeEntity>();
    for (const row of [...incomplete, ...stale]) {
      map.set(row.nodeId, row);
    }
    return [...map.values()].map(toRecord);
  }
}

function toRecord(entity: ProcessedNodeEntity): ProcessedNodeRecord {
  return {
    scopeKey: entity.scopeKey,
    nodeId: entity.nodeId,
    simplified: entity.simplified ?? {},
    calculated: entity.calculated ?? {},
    ready: entity.ready,
    updatedAt: entity.updatedAt,
    staleAfter: entity.staleAfter,
  };
}
