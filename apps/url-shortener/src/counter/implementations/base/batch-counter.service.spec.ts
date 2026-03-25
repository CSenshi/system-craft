import { BatchCounterService } from './batch-counter.service';

class TestBatchCounter extends BatchCounterService {
  reserveBatch = jest.fn();

  constructor(batchSize: number) {
    super(batchSize);
  }
}

describe('BatchCounterService', () => {
  let counter: TestBatchCounter;

  beforeEach(() => {
    counter = new TestBatchCounter(3);
    counter.reserveBatch.mockResolvedValue([1, 2, 3]);
  });

  describe('getNextCount', () => {
    it('should call reserveBatch when queue is empty', async () => {
      await counter.getNextCount();

      expect(counter.reserveBatch).toHaveBeenCalledWith(3);
    });

    it('should return items from queue in FIFO order', async () => {
      const first = await counter.getNextCount();
      const second = await counter.getNextCount();
      const third = await counter.getNextCount();

      expect(first).toBe(1);
      expect(second).toBe(2);
      expect(third).toBe(3);
    });

    it('should not call reserveBatch again while queue has items', async () => {
      await counter.getNextCount();
      await counter.getNextCount();

      expect(counter.reserveBatch).toHaveBeenCalledTimes(1);
    });

    it('should call reserveBatch again when queue is exhausted', async () => {
      counter.reserveBatch
        .mockResolvedValueOnce([1, 2, 3])
        .mockResolvedValueOnce([4, 5, 6]);

      // Exhaust first batch
      await counter.getNextCount();
      await counter.getNextCount();
      await counter.getNextCount();

      // Should trigger second batch
      const fourth = await counter.getNextCount();

      expect(counter.reserveBatch).toHaveBeenCalledTimes(2);
      expect(fourth).toBe(4);
    });

    it('should deduplicate concurrent reserveBatch calls', async () => {
      let resolveFirst: (value: number[]) => void;
      counter.reserveBatch.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      );

      // Fire two concurrent getNextCount calls
      const p1 = counter.getNextCount();
      const p2 = counter.getNextCount();

      // Only one reserveBatch should be in flight
      expect(counter.reserveBatch).toHaveBeenCalledTimes(1);

      // Resolve with enough items for both
      resolveFirst!([10, 20]);

      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1).toBe(10);
      expect(r2).toBe(20);
    });
  });
});
