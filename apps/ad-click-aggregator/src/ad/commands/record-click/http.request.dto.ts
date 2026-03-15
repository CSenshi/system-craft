import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, MaxLength } from 'class-validator';

export class HttpRequestBodyDto {
  @ApiProperty({ example: 'ad_42' })
  @IsString()
  @MaxLength(256)
  readonly adId: string;

  @ApiProperty({ example: 'user_99' })
  @IsString()
  @MaxLength(256)
  readonly userId: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  @IsDateString()
  readonly timestamp: string;
}
