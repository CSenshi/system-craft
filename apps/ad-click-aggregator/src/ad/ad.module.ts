import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { RecordClick } from './commands/record-click';
import { KafkaProducer } from './infrastructure/kafka.producer';
import { GetMetrics } from './queries/get-metrics';
import { ClickMetricsRepository } from './repositories/click-metrics.repository';

@Module({
  imports: [CqrsModule],
  controllers: [RecordClick.HttpController, GetMetrics.HttpController],
  providers: [
    RecordClick.Service,
    GetMetrics.Service,
    KafkaProducer,
    ClickMetricsRepository,
  ],
})
export class AdModule {}
