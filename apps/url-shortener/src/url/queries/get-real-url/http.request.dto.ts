import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class HttpRequestParamDto {
  @ApiProperty({
    description: 'The URL to shorten',
    example: 'abc123',
    format: 'string',
  })
  @IsString()
  @MaxLength(7)
  readonly shortUrlId: string;
}
