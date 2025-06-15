import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { CqrsModule } from '@nestjs/cqrs';

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
})
export class AppModule {}
