import { AggregateRoot } from '@nestjs/cqrs';

export abstract class AggregateRootBase<T> extends AggregateRoot {
  constructor(props: T) {
    super();
    this.validate();
    Object.assign(this, props);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  validate(): void {}
}
