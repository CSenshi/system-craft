import { Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { BaseQuery } from '@libs/shared';
import {
  ClickMetricsRepository,
  Granularity,
} from '../../repositories/click-metrics.repository';
import { HttpResponseDto } from './http.response.dto';

export class Query extends BaseQuery<Query, HttpResponseDto> {
  readonly adId: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly granularity: Granularity;
}

@QueryHandler(Query)
export class Service implements IQueryHandler<Query, HttpResponseDto> {
  private readonly logger = new Logger('GetMetrics.Service');

  constructor(
    private readonly clickMetricsRepository: ClickMetricsRepository,
  ) {}

  async execute(query: Query): Promise<HttpResponseDto> {
    this.logger.debug({
      msg: 'Fetching metrics',
      adId: query.adId,
      granularity: query.granularity,
    });

    const windows = await this.clickMetricsRepository.getMetrics(
      query.adId,
      query.startTime,
      query.endTime,
      query.granularity,
    );

    return new HttpResponseDto({ windows });
  }
}
