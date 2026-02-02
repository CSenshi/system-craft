import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisModule } from '@nestjs-redis/client';
import { COUNTER_BATCH_SIZE } from '../../counter.constants';
import { RedisBatchCounterService } from './redis-batch-counter.service';

const TEST_BATCH_SIZE = 5;

describe('RedisBatchCounterService (integration)', () => {
  let moduleRef: TestingModule;
  let service: RedisBatchCounterService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        RedisModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            type: 'client',
            options: { url: configService.getOrThrow<string>('REDIS_HOST') },
          }),
        }),
      ],
      providers: [
        RedisBatchCounterService,
        { provide: COUNTER_BATCH_SIZE, useValue: TEST_BATCH_SIZE },
      ],
    }).compile();

    service = moduleRef.get(RedisBatchCounterService);

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
    const total = TEST_BATCH_SIZE * 20 + 1;
    const values: number[] = [];

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
