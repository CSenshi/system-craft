import { Body, Controller, Post, Redirect } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiTags } from '@nestjs/swagger';
import { RecordClick } from '.';

// TODO: look up the real advertiser URL from ad storage once we have it
const PLACEHOLDER_REDIRECT_URL = 'https://example.com';

@Controller('click')
@ApiTags('click')
export class HttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @Redirect(PLACEHOLDER_REDIRECT_URL, 302)
  async recordClick(
    @Body() body: RecordClick.HttpRequestBodyDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new RecordClick.Command({
        adId: body.adId,
        userId: body.userId,
        timestamp: body.timestamp,
      }),
    );
  }
}
