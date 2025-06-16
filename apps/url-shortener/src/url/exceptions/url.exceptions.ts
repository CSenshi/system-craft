import { BaseExceptionCls } from '@libs/shared';

export class UrlNotFoundExceptions extends BaseExceptionCls('URL.NOT_FOUND') {
  constructor() {
    super(`Url not found`);
  }
}

export class InvalidCharacterError extends BaseExceptionCls('URL.INVALID_CHARACTER') {
  constructor() {
    super(`Url not found`);
  }
}
