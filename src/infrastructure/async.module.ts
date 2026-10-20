import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NODE_ENRICHER } from '@Domain/ports/node-enricher.port.js';
import { ProcessedNodeStore } from '@Domain/ports/processed-node.store.js';
import { V1BlueprintListController } from '@Inbound/industry/v1-blueprint-list.controller.js';
import { BlueprintListService } from '@Outbound/blueprint-list/blueprint-list.service.js';
import { EnrichmentQueueService } from '@Outbound/enrichment-queue/enrichment-queue.service.js';
import { SseFanoutService } from '@Outbound/sse-fanout/sse-fanout.service.js';
import { InMemoryProcessedNodeStore } from '@Outbound/persistence/in-memory-processed-node.store.js';
import { ProcessedNodeEntity } from '@Outbound/persistence/processed-node.entity.js';
import { TypeOrmProcessedNodeStore } from '@Outbound/persistence/typeorm-processed-node.store.js';

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
    BlueprintListService,
    { provide: NODE_ENRICHER, useExisting: BlueprintListService },
    EnrichmentQueueService,
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
