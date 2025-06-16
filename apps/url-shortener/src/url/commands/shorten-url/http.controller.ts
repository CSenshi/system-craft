import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ShortenUrl } from '.';
import { CommandBus } from '@nestjs/cqrs';

@Controller('url')
@ApiTags('url')
export class HttpController {
	constructor(private readonly commandBus: CommandBus) { }

	@Post()
	async shortenUrl(@Body() body: ShortenUrl.HttpRequestBodyDto): Promise<ShortenUrl.HttpResponseDto> {
		const result = await this.commandBus.execute(new ShortenUrl.Command({
			url: body.url
		}));

		return new ShortenUrl.HttpResponseDto({
			shortUrl: result.shortUrl
		});
	}
}
