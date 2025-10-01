import { Controller, Get, Param, Res, UseFilters } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, seconds } from '@nestjs/throttler';
import { GetRealUrl } from '.';
import { UrlExceptionFilter } from '../../exceptions/url.exception-filter';

@Controller('l')
@ApiTags('url')
@UseFilters(UrlExceptionFilter)
export class HttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':shortUrlId')
  @Throttle({ default: { limit: 2_000, ttl: seconds(10) } })
  async redirectToUrl(
    @Param() params: GetRealUrl.HttpRequestParamDto,
    @Res({ passthrough: true }) res: any,
  ): Promise<void> {
    const result = await this.queryBus.execute(
      new GetRealUrl.Query({
        shortUrlId: params.shortUrlId,
      }),
    );

    res.redirect(result.url, 302);
  }
}
