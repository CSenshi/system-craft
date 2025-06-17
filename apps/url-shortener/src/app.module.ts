import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { UnhandledExceptionsListener } from './unhandled-exceptions.listener';
import { UrlModule } from './url/url.module';

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
