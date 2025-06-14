import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class HttpRequestParamDto {
	@ApiProperty({ description: 'The shortened URL identifier', example: 'abc123' })
	@IsString()
	readonly shortUrlId: string;
}