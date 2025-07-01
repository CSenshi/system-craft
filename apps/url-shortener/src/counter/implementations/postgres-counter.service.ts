import { Injectable } from '@nestjs/common';
import { CounterService } from '../counter.service';
import { PrismaService } from '../../prisma/prisma.service';
import { getNextShortUrlId } from '@prisma/client/sql'

@Injectable()
export class PostgresCounterService extends CounterService {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getNextCount(): Promise<number> {
    const result = await this.prisma.$queryRawTyped(getNextShortUrlId())
    const nextSequenceNum = result[0].nextval;

    return Number(nextSequenceNum);
  }
} 