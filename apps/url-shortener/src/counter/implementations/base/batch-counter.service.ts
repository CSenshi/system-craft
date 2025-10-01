import { CounterService } from '../../counter.service';

export abstract class BatchCounterService extends CounterService {
  private readonly queue: number[] = [];
  private ongoingFetch: Promise<unknown> | null;

  protected constructor(private readonly batchSize: number) {
    super();
  }

  protected abstract reserveBatch(batchSize: number): Promise<number[]>;

  async getNextCount(): Promise<number> {
    while (true) {
      await this.ensureBatch();

      const next = this.queue.shift();

      if (next !== undefined) {
        return next;
      }
    }
  }

  private async ensureBatch(): Promise<void> {
    while (this.queue.length === 0) {
      // Only one reservation should be in-flight at any time
      if (!this.ongoingFetch) {
        this.ongoingFetch = this.reserveBatch(this.batchSize)
          .then((batch) => this.queue.push(...batch))
          .finally(() => (this.ongoingFetch = null));
      }

      // Wait for the ongoing reservation to complete.
      // Another concurrent request may already be fetching a batch.
      await this.ongoingFetch;
    }
  }
}
