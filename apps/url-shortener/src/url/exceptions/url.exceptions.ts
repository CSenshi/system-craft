import { BaseExceptionCls } from '@libs/shared';

export class UrlNotFoundExceptions extends BaseExceptionCls('URL.NOT_FOUND') {
  constructor() {
    super(`Url not found`);
  }
}
