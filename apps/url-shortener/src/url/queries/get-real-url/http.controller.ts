import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import {
  Controller,
  Get,
  Inject,
  Param,
  Res,
  UseFilters,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, seconds } from '@nestjs/throttler';
import { GetRealUrl } from '.';
import { UrlExceptionFilter } from '../../exceptions/url.exception-filter';

@Controller('l')
@ApiTags('url')
@UseFilters(UrlExceptionFilter)
export class HttpController {
  constructor(
    private readonly queryBus: QueryBus,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Get(':shortUrlId')
  @Throttle({ default: { limit: 2_000, ttl: seconds(10) } })
  async redirectToUrl(
    @Param() params: GetRealUrl.HttpRequestParamDto,
    @Res({ passthrough: true }) res: any,
  ): Promise<void> {
    // Check cache first and return with header x-cache: HIT
    // If not found, query from DB and set to cache with header x-cache: MISS
    const cachedUrl = await this.cacheManager.get<string>(params.shortUrlId);
    if (cachedUrl) {
      res.header('x-cache', 'HIT');
      res.redirect(cachedUrl, 302);
    }

    const result = await this.queryBus.execute(
      new GetRealUrl.Query({
        shortUrlId: params.shortUrlId,
      }),
    );

    await this.cacheManager.set(params.shortUrlId, result.url, 60_000);
    res.header('x-cache', 'MISS');
    res.redirect(result.url, 302);
  }
}
