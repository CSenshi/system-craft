import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '../../../prisma/generated/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { COUNTER_BATCH_SIZE } from '../../counter.constants';
import { BatchCounterService } from '../base/batch-counter.service';

@Injectable()
export class PostgresBatchCounterService extends BatchCounterService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(COUNTER_BATCH_SIZE) batchSize: number,
  ) {
    super(batchSize);
  }

  protected async reserveBatch(batchSize: number): Promise<number[]> {
    const [{ setval }] = await this.prisma.$queryRaw<
      { setval: bigint }[]
    >(Prisma.sql`
      SELECT setval(
        'next_shortend_urls_id_seq',
        nextval('next_shortend_urls_id_seq') + ${batchSize} - 1
      )
    `);

    if (!setval) {
      throw new Error('Failed to reserve counter batch');
    }

    const end = Number(setval);
    const start = end - batchSize + 1;

    return Array.from({ length: batchSize }, (_, i) => start + i);
  }
}
