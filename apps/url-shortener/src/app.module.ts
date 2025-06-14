import { Module } from '@nestjs/common';
import { ShortenUrl } from './url/commands/shorten-url';
import { LoggerModule } from 'nestjs-pino';
import { CqrsModule } from '@nestjs/cqrs';
import { GetRealUrl } from './url/queries/get-real-url';

@Module({
  imports: [
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
  ],
  controllers: [
    ShortenUrl.HttpController,
    GetRealUrl.HttpController
  ],
  providers: [
    ShortenUrl.Service,
    GetRealUrl.Service,
  ],
})
export class AppModule { }
