import { ArgumentsHost, Catch } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { BaseException } from '@libs/shared';
import { InvalidCharacterError, UrlNotFoundExceptions } from './url.exceptions';

@Catch()
export class UrlExceptionFilter extends BaseExceptionFilter {
  override catch(exception: BaseException, host: ArgumentsHost) {
    const customMessage = {
      code: exception.code,
      message: exception.message,
    };

    if (
      exception instanceof UrlNotFoundExceptions ||
      exception instanceof InvalidCharacterError
    ) {
      return super.catch(new NotFoundException(customMessage), host);
    }

    return super.catch(exception, host);
  }
}
