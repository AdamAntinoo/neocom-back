import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'processed_nodes' })
@Index(['scopeKey', 'nodeId'], { unique: true })
export class ProcessedNodeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'scope_key', type: 'varchar', length: 256 })
  scopeKey!: string;

  @Column({ name: 'node_id', type: 'varchar', length: 128 })
  nodeId!: string;

  @Column({ type: 'jsonb', default: {} })
  simplified!: Record<string, unknown>;

  @Column({ type: 'jsonb', default: {} })
  calculated!: Record<string, unknown>;

  @Column({ type: 'boolean', default: false })
  ready!: boolean;

  @Column({ name: 'stale_after', type: 'timestamptz', nullable: true })
  staleAfter!: Date | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
