import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { CqrsModule } from '@nestjs/cqrs';
import { UrlModule } from './url/url.module';
import { PrismaModule } from './prisma/prisma.module';
import { UnhandledExceptionsListener } from './unhandled-exceptions.listener';

@Module({
  imports: [
    PrismaModule,
    CqrsModule.forRoot(),
    LoggerModule.forRoot({
      pinoHttp: {
        base: {},
        autoLogging: false,
        level: 'debug',
        transport:
          process.env['NODE_ENV'] !== 'production'
            ? { target: 'pino-pretty' }
            : undefined,
      },
    }),
    UrlModule,
  ],
  providers: [UnhandledExceptionsListener],
})
export class AppModule {}
