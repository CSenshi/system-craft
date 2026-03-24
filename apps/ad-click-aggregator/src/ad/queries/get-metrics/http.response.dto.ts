import { ApiProperty } from '@nestjs/swagger';
import { BaseDto } from '@libs/shared';

export class ClickWindowDto {
  @ApiProperty({ example: '2024-01-15T10:00:00.000Z' })
  readonly windowStart: string;

  @ApiProperty({ example: '2024-01-15T10:01:00.000Z' })
  readonly windowEnd: string;

  @ApiProperty({ example: 42 })
  readonly clickCount: number;
}

export class HttpResponseDto extends BaseDto<HttpResponseDto> {
  @ApiProperty({ type: [ClickWindowDto] })
  readonly windows: ClickWindowDto[];
}
