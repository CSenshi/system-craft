import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisModule } from '@nestjs-redis/kit';
import { RedisCounterService } from './redis-counter.service';

describe('RedisCounterService (integration)', () => {
  let service: RedisCounterService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
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
      providers: [RedisCounterService],
    }).compile();
    service = module.get(RedisCounterService);

    await module.init();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should increment and return the counter', async () => {
    const first = await service.getNextCount();
    const second = await service.getNextCount();
    expect(typeof first).toBe('number');
    expect(second).toBe(first + 1);
  });

  it('should always return a number and increase monotonically', async () => {
    let last = await service.getNextCount();
    for (let i = 0; i < 1000; i++) {
      const curr = await service.getNextCount();
      expect(typeof curr).toBe('number');
      expect(curr).toBe(last + 1);
      last = curr;
    }
  });
});
