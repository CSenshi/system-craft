import { ApiProperty } from '@nestjs/swagger';
import { BaseDto } from '@libs/shared';

export class HttpResponseDto extends BaseDto<HttpResponseDto> {
  @ApiProperty({ description: 'The shortened URL' })
  readonly shortUrl: string;
}
