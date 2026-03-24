import { Global, Module } from '@nestjs/common';
import { ClickHouseClient, createClient } from '@clickhouse/client';

@Global()
@Module({
  providers: [
    {
      provide: ClickHouseClient,
      useFactory: (): ClickHouseClient =>
        createClient({
          url: process.env['CLICKHOUSE_URL'] ?? 'http://localhost:8123',
          username: process.env['CLICKHOUSE_USER'] ?? 'default',
          password: process.env['CLICKHOUSE_PASSWORD'] ?? 'clickhouse',
        }),
    },
  ],
  exports: [ClickHouseClient],
})
export class ClickhouseModule {}
