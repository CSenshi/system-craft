import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { AdModule } from '../ad/ad.module';
import { ClickhouseModule } from '../clickhouse/clickhouse.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CqrsModule.forRoot(),
    ClickhouseModule,
    AdModule,
  ],
})
export class AppModule {}
