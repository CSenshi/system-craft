import { BaseDto } from '@libs/shared';
import { ApiProperty } from '@nestjs/swagger';

export class HttpResponseDto extends BaseDto<HttpResponseDto> {
  @ApiProperty({ description: 'The shortened URL' })
  readonly shortUrl: string;
}
