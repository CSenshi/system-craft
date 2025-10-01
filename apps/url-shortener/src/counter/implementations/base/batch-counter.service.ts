import { CounterService } from '../../counter.service';

export abstract class BatchCounterService extends CounterService {
  private readonly queue: number[] = [];
  private ongoingFetch: Promise<unknown> | null;

  protected constructor(private readonly batchSize: number) {
    super();
  }

  protected abstract reserveBatch(batchSize: number): Promise<number[]>;

  async getNextCount(): Promise<number> {
    await this.ensureBatch();

    const next = this.queue.shift();

    if (next === undefined) {
      throw new Error('Unable to retrieve the next counter value');
    }

    return next;
  }

  private async ensureBatch(): Promise<void> {
    if (this.queue.length > 0) return;

    // Only one reservation should be in-flight at any time
    if (!this.ongoingFetch) {
      this.ongoingFetch = this.reserveBatch(this.batchSize)
        .then((batch) => this.queue.push(...batch))
        .finally(() => (this.ongoingFetch = null));
    }

    // Wait for the ongoing reservation to complete
    // Ongoing reservation might be called by another concurrent request or by this one
    await this.ongoingFetch;
  }
}
