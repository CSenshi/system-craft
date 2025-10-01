import { ApiProperty } from '@nestjs/swagger';
import { BaseDto } from '@libs/shared';

export class HttpResponseDto extends BaseDto<HttpResponseDto> {
  @ApiProperty({ description: 'Real URL' })
  readonly url: string;

  @ApiProperty({
    description: 'HTTP status code used for the redirect response',
    enum: [302, 307],
  })
  readonly redirectStatusCode: 302 | 307;
}
