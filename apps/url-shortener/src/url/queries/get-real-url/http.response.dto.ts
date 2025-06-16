import { ApiProperty } from '@nestjs/swagger';
import { BaseDto } from '@libs/shared';

export class HttpResponseDto extends BaseDto<HttpResponseDto> {
  @ApiProperty({ description: 'Real URL' })
  readonly url: string;
}
