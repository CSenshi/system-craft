import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../../../prisma/prisma.module';
import { COUNTER_BATCH_SIZE } from '../../counter.constants';
import { PostgresBatchCounterService } from './postgres-batch-counter.service';

const TEST_BATCH_SIZE = 5;

describe('PostgresBatchCounterService (integration)', () => {
  let moduleRef: TestingModule;
  let service: PostgresBatchCounterService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [
        PostgresBatchCounterService,
        { provide: COUNTER_BATCH_SIZE, useValue: TEST_BATCH_SIZE },
      ],
    }).compile();

    service = moduleRef.get(PostgresBatchCounterService);

    await moduleRef.init();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  const expectSequential = (values: number[]) => {
    for (let index = 1; index < values.length; index++) {
      expect(values[index]).toBe(values[index - 1] + 1);
    }
  };

  it('returns monotonically increasing identifiers across batches', async () => {
    const values: number[] = [];
    const total = TEST_BATCH_SIZE * 2 + 1;

    for (let index = 0; index < total; index++) {
      values.push(await service.getNextCount());
    }

    expect(values).toHaveLength(total);
    expectSequential(values);
  });

  it('fulfils concurrent requests without duplicating identifiers', async () => {
    const requests = Array.from({ length: TEST_BATCH_SIZE * 3 }, () =>
      service.getNextCount(),
    );

    const values = await Promise.all(requests);
    const sorted = [...values].sort((a, b) => a - b);

    expect(new Set(values).size).toBe(values.length);
    expectSequential(sorted);
  });
});
