import { Test, TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../../prisma/prisma.module';
import { PostgresCounterService } from './postgres-counter.service';

describe('PostgresCounterService (integration)', () => {
  let service: PostgresCounterService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [PostgresCounterService],
    }).compile();
    service = module.get(PostgresCounterService);
  });

  it('should increment and return the counter', async () => {
    const first = await service.getNextCount();
    const second = await service.getNextCount();
    expect(second).toBe(first + 1);
    expect(typeof first).toBe('number');
  });

  it('should always return a number and increase monotonically', async () => {
    let last = await service.getNextCount();
    for (let i = 0; i < 10; i++) {
      const curr = await service.getNextCount();
      expect(typeof curr).toBe('number');
      expect(curr).toBeGreaterThan(last);
      last = curr;
    }
  });
});
