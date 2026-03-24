import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GetMetrics } from '.';

@Controller('metrics')
@ApiTags('metrics')
export class HttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOkResponse({ type: GetMetrics.HttpResponseDto })
  async getMetrics(
    @Query() query: GetMetrics.HttpRequestQueryDto,
  ): Promise<GetMetrics.HttpResponseDto> {
    return this.queryBus.execute(
      new GetMetrics.Query({
        adId: query.adId,
        startTime: query.startTime,
        endTime: query.endTime,
        granularity: query.granularity,
      }),
    );
  }
}
