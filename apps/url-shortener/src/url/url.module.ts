import { Module } from '@nestjs/common';
import { CounterModule } from '../counter/counter.module';
import { ShortenUrl } from './commands/shorten-url';
import { GetRealUrl } from './queries/get-real-url';
import { IdObfuscatorService } from './app-services/id-obfuscator.service';
import { NumberHasherService } from './app-services/number-hasher.service';
import { UrlRepository } from './repositories/url.repository';

@Module({
  imports: [CounterModule],
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
