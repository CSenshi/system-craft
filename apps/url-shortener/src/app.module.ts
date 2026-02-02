import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import { RedisModule, RedisToken } from '@nestjs-redis/client';
import { RedisThrottlerStorage } from '@nestjs-redis/throttler-storage';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { UnhandledExceptionsListener } from './unhandled-exceptions.listener';
import { UrlModule } from './url/url.module';

@Module({
  imports: [
    RedisModule.forRoot({
      options: { url: process.env['REDIS_HOST'] },
      isGlobal: true,
    }),
    PrismaModule,
    CqrsModule.forRoot(),
    LoggerModule.forRoot({
      pinoHttp: {
        base: {},
        autoLogging: false,
        level: 'error',
        transport:
          process.env['NODE_ENV'] !== 'production'
            ? { target: 'pino-pretty' }
            : undefined,
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [RedisToken()],
      useFactory: (redis: any) => ({
        throttlers: [{ limit: 1, ttl: seconds(10) }],
        storage: new RedisThrottlerStorage(redis),
      }),
    }),
    UrlModule,
  ],
  controllers: [],
  providers: [
    UnhandledExceptionsListener,
    // {
    //   provide: APP_GUARD,
    //   useClass: ThrottlerGuard,
    // },
  ],
})
export class AppModule {}
