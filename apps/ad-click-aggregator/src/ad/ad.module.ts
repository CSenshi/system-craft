import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { RecordClick } from './commands/record-click';
import { KafkaProducer } from './infrastructure/kafka.producer';

@Module({
  imports: [CqrsModule, ConfigModule],
  controllers: [RecordClick.HttpController],
  providers: [RecordClick.Service, KafkaProducer],
})
export class AdModule {}
