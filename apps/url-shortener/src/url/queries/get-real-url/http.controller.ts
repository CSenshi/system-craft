import { Controller, Get, Param, UseFilters } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags } from '@nestjs/swagger';
import { GetRealUrl } from '.';
import { UrlExceptionFilter } from '../../exceptions/url.exception-filter';

@Controller('l')
@ApiTags('url')
@UseFilters(UrlExceptionFilter)
export class HttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':shortUrlId')
  async redirectToUrl(
    @Param() params: GetRealUrl.HttpRequestParamDto,
  ): Promise<GetRealUrl.HttpResponseDto> {
    const result = await this.queryBus.execute(
      new GetRealUrl.Query({
        shortUrlId: params.shortUrlId,
      }),
    );

    return new GetRealUrl.HttpResponseDto({
      url: result.url,
    });
  }
}
