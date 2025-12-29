import { Module } from '@nestjs/common';
import { RateLimiterModule } from './rate-limiter/rate-limiter.module';

@Module({
  imports: [RateLimiterModule],
})
export class AppModule {}
