import { AggregateRoot } from '@nestjs/cqrs';

export abstract class AggregateRootBase<T> extends AggregateRoot {
  constructor(props: T) {
    super();
    this.validate();
    Object.assign(this, props);
  }

  validate(): void {} 
}
