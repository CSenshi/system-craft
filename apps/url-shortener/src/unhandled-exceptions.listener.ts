import { Injectable, Logger } from '@nestjs/common';
import { UnhandledExceptionBus } from '@nestjs/cqrs';
import { Subject, takeUntil } from 'rxjs';

@Injectable()
export class UnhandledExceptionsListener {
  private logger = new Logger(UnhandledExceptionsListener.name);
  private destroy$ = new Subject<void>();

  constructor(private unhandledExceptionsBus: UnhandledExceptionBus) {
    this.unhandledExceptionsBus
      .pipe(takeUntil(this.destroy$))
      .subscribe((exceptionInfo) => {
        this.logger.error(exceptionInfo.exception, exceptionInfo.cause);
      });
  }

  onModuleDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
