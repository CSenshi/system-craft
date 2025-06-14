import { Query } from '@nestjs-architects/typed-cqrs';

export class BaseQuery<T, R = void> extends Query<R> {
  constructor(data: Omit<T, ''>) {
    super();
    Object.assign(this, data);
  }
}
