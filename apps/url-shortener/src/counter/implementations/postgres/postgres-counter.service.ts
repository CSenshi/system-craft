import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../prisma/generated/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CounterService } from '../../counter.service';

@Injectable()
export class PostgresCounterService extends CounterService {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getNextCount(): Promise<number> {
    const result = await this.prisma.$queryRaw<{ nextval: bigint }[]>(
      Prisma.sql`SELECT nextval('next_shortend_urls_id_seq') AS nextval`,
    );

    const nextSequenceNum = result[0].nextval;

    return Number(nextSequenceNum);
  }
}
