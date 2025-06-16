import { ApiProperty } from "@nestjs/swagger";
import { IsUrl, MaxLength } from "class-validator";

export class HttpRequestBodyDto {
	@ApiProperty({
		description: 'The URL to shorten',
		example: 'https://example.com/very-long-url',
		format: 'url'
	})
	@IsUrl()
	@MaxLength(2048)
	readonly url: string;
}