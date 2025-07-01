import { Injectable } from '@nestjs/common';
import { getNextShortUrlId } from '@prisma/client/sql';
import { PrismaService } from '../../prisma/prisma.service';
import { CounterService } from '../counter.service';

@Injectable()
export class PostgresCounterService extends CounterService {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getNextCount(): Promise<number> {
    const result = await this.prisma.$queryRawTyped(getNextShortUrlId());
    const nextSequenceNum = result[0].nextval;

    return Number(nextSequenceNum);
  }
}
