import { Command } from '@nestjs-architects/typed-cqrs';

export class BaseCommand<T, R = void> extends Command<R> {
  constructor(data: Omit<T, ''>) {
    super();
    Object.assign(this, data);
  }
}
