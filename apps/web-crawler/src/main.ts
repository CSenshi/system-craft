/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(AppModule);
  await app.listen();
  Logger.log(`🚀 Application is ready to receive messages`);
}

bootstrap();
