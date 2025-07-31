import { Body, Controller, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, seconds } from '@nestjs/throttler';
import { ShortenUrl } from '.';

@Controller('url')
@ApiTags('url')
export class HttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @Throttle({ default: { limit: 100, ttl: seconds(1) } })
  async shortenUrl(
    @Body() body: ShortenUrl.HttpRequestBodyDto,
  ): Promise<ShortenUrl.HttpResponseDto> {
    const result = await this.commandBus.execute(
      new ShortenUrl.Command({
        url: body.url,
      }),
    );

    return new ShortenUrl.HttpResponseDto({
      shortUrl: result.shortUrl,
    });
  }
}
