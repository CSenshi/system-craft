import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetRealUrl } from '.';
import { QueryBus } from '@nestjs/cqrs';

@Controller()
@ApiTags('url')
export class HttpController {
	constructor(private readonly queryBus: QueryBus) { }

	@Get('/:shortUrlId')
	async redirectToUrl(@Param() body: GetRealUrl.HttpRequestParamDto): Promise<GetRealUrl.HttpResponseDto> {
		const result = await this.queryBus.execute(new GetRealUrl.Query({
			shortUrlId: body.shortUrlId
		}));

		return new GetRealUrl.HttpResponseDto({
			url: result.url
		});
	}
}
