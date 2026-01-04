import { Controller, Get, UseGuards } from '@nestjs/common';
import { RateLimit } from '../decorators/rate-limit.decorator';
import { RateLimitGuard } from '../guards';

@Controller('rate-limit')
@UseGuards(RateLimitGuard)
export class RateLimitController {
  @Get('check/default')
  @RateLimit({ ruleId: 'default' })
  async checkLimitDefault() {
    return { status: 'OK' };
  }

  @Get('check/api-requests')
  @RateLimit({ ruleId: 'api-requests' })
  async checkLimitApiRequests() {
    return { status: 'OK' };
  }

  @Get('check/strict')
  @RateLimit({ ruleId: 'strict' })
  async checkLimitStrict() {
    return { status: 'OK' };
  }
}
