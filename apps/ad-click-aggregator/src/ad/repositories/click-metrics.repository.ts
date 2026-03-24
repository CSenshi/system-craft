import { Injectable } from '@nestjs/common';
import { ClickHouseClient } from '@clickhouse/client';

export type Granularity = '1m' | '1h' | '1d';

export interface ClickWindow {
  windowStart: string;
  windowEnd: string;
  clickCount: number;
}

const TABLE_BY_GRANULARITY: Record<Granularity, string> = {
  '1m': 'ad_clicks_1m',
  '1h': 'ad_clicks_1h',
  '1d': 'ad_clicks_1d',
};

@Injectable()
export class ClickMetricsRepository {
  constructor(private readonly client: ClickHouseClient) {}

  async getMetrics(
    adId: string,
    startTime: string,
    endTime: string,
    granularity: Granularity,
  ): Promise<ClickWindow[]> {
    const table = TABLE_BY_GRANULARITY[granularity];

    const result = await this.client.query({
      query: `
        SELECT
          windowStart,
          windowEnd,
          sum(clickCount) AS clickCount
        FROM {table:Identifier}
        WHERE adId = {adId:String}
          AND windowStart >= parseDateTimeBestEffort({startTime:String})
          AND windowStart <  parseDateTimeBestEffort({endTime:String})
        GROUP BY windowStart, windowEnd
        ORDER BY windowStart ASC
      `,
      query_params: { table, adId, startTime, endTime },
      format: 'JSONEachRow',
    });

    type Row = { windowStart: string; windowEnd: string; clickCount: string };
    const rows = await result.json<Row>();

    return rows.map((row) => ({
      windowStart: row.windowStart,
      windowEnd: row.windowEnd,
      clickCount: Number(row.clickCount),
    }));
  }
}
