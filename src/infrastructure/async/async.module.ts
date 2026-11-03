import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { V1BlueprintListController } from '../adapters/inbound/async/v1-blueprint-list.controller.js';
import { BlueprintListService } from './blueprint-list.service.js';
import { EnrichmentQueueService } from './enrichment-queue.service.js';
import { InMemoryProcessedNodeStore } from './in-memory-processed-node.store.js';
import { ProcessedNodeEntity } from './processed-node.entity.js';
import { ProcessedNodeStore } from './processed-node.store.js';
import { SseFanoutService } from './sse-fanout.service.js';
import { TypeOrmProcessedNodeStore } from './typeorm-processed-node.store.js';

const useTypeOrm = Boolean(process.env['DATABASE_URL']);

@Module({
  imports: [
    ConfigModule,
    ...(useTypeOrm
      ? [
          TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
              type: 'postgres' as const,
              url: config.get<string>('DATABASE_URL'),
              entities: [ProcessedNodeEntity],
              synchronize: config.get<string>('TYPEORM_SYNC') === 'true',
              logging: false,
            }),
          }),
          TypeOrmModule.forFeature([ProcessedNodeEntity]),
        ]
      : []),
  ],
  controllers: [V1BlueprintListController],
  providers: [
    SseFanoutService,
    EnrichmentQueueService,
    BlueprintListService,
    InMemoryProcessedNodeStore,
    ...(useTypeOrm ? [TypeOrmProcessedNodeStore] : []),
    {
      provide: ProcessedNodeStore,
      useExisting: useTypeOrm ? TypeOrmProcessedNodeStore : InMemoryProcessedNodeStore,
    },
  ],
  exports: [ProcessedNodeStore, BlueprintListService, SseFanoutService],
})
export class AsyncModule {}
