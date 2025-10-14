import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CounterModule } from '../counter/counter.module';
import { IdObfuscatorService } from './app-services/id-obfuscator.service';
import { NumberHasherService } from './app-services/number-hasher.service';
import { ShortenUrl } from './commands/shorten-url';
import { GetRealUrl } from './queries/get-real-url';
import { UrlRepository } from './repositories/url.repository';

@Module({
  imports: [
    CounterModule.forRoot({ provider: 'redis', batching: { size: 1000 } }),
    ConfigModule.forRoot(),
    CacheModule.register(),
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
export class UrlModule {}
