export abstract class CounterService {
  abstract getNextCount(): Promise<number>;
}
