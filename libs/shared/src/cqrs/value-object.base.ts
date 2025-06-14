export abstract class ValueObjectBase<T> {
  constructor(protected readonly value: T) {
    this.validate();
  }

  protected abstract validate(): void;

  get rawValue() {
    return this.value;
  }
}
