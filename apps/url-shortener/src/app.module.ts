import { Module } from '@nestjs/common';
import { ShortenUrl } from './url/commands/shorten-url';
import { LoggerModule } from 'nestjs-pino';
import { CqrsModule } from '@nestjs/cqrs';
import { GetRealUrl } from './url/queries/get-real-url';
import { IdObfuscatorService } from './url/app-services/id-obfuscator.service';
import { NumberHasherService } from './url/app-services/number-hasher.service';
import { CounterModule } from './counter/counter.module';
import { UrlRepository } from './url/repositories/url.repository';

@Module({
  imports: [
    CounterModule,
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
  controllers: [ShortenUrl.HttpController, GetRealUrl.HttpController],
  providers: [
    ShortenUrl.Service,
    GetRealUrl.Service,
    IdObfuscatorService,
    UrlRepository,
    NumberHasherService,
  ],
})
export class AppModule {}
