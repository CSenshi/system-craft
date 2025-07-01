import { Test, TestingModule } from '@nestjs/testing';
import { RedisModule } from '@nestjs-modules/ioredis';
import { RedisCounterService } from './redis-counter.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

describe('RedisCounterService (integration)', () => {
  let service: RedisCounterService;
  let redis: Redis;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        RedisModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            type: 'single',
            host: configService.getOrThrow<string>('REDIS_HOST'),
          }),
        }),
      ],
      providers: [RedisCounterService],
    }).compile();
    service = module.get(RedisCounterService);

    redis = module.get<Redis>(getRedisConnectionToken());
  });

  afterAll(async () => {
    // Note: Redis needs to be closed after tests because otherwise jest will hang
    await redis.quit();
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

function getRedisConnectionToken(): string {
  /**
   * As RedisModule does not export a connection token,
   * we create a custom injection token for the default connection.
   * This allows us to inject the Redis client in tests.
   * 
   * Code is taken from:
   * https://github.com/nest-modules/ioredis/blob/fbc152514e8b90cb855c7c9f652d0460b18edf3c/lib/redis.utils.ts#L13C17-L13C40
   * function: `getRedisConnectionToken`
   */
  const REDIS_MODULE_CONNECTION = 'default';
  const REDIS_MODULE_CONNECTION_TOKEN = 'IORedisModuleConnectionToken';
  const injectionToken = `${REDIS_MODULE_CONNECTION}_${REDIS_MODULE_CONNECTION_TOKEN}`;
  return injectionToken;
}