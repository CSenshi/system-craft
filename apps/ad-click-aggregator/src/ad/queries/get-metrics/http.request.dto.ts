import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsString, MaxLength } from 'class-validator';
import type { Granularity } from '../../repositories/click-metrics.repository';

export class HttpRequestQueryDto {
  @ApiProperty({ example: 'ad_42' })
  @IsString()
  @MaxLength(256)
  readonly adId: string;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z' })
  @IsDateString()
  readonly startTime: string;

  @ApiProperty({ example: '2024-01-15T11:00:00.000Z' })
  @IsDateString()
  readonly endTime: string;

  @ApiProperty({ enum: ['1m', '1h', '1d'], example: '1m' })
  @IsEnum(['1m', '1h', '1d'])
  readonly granularity: Granularity;
}
