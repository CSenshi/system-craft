import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { RateLimitRule } from '../rate-limiter.types';

/**
 * Service for managing rate limiting rules.
 * Currently uses in-memory storage, but can be extended to use a database or config service.
 */
@Injectable()
export class RuleManagerService implements OnModuleInit {
  private readonly logger = new Logger(RuleManagerService.name);
  private readonly rules = new Map<string, RateLimitRule>();

  onModuleInit() {
    this.rules.set('default', {
      algorithm: 'token-bucket',
      limit: 100,
      windowSeconds: 60,
    });

    this.rules.set('api-requests', {
      algorithm: 'token-bucket',
      limit: 1000,
      windowSeconds: 3600,
    });

    this.rules.set('strict', {
      algorithm: 'sliding-window-log',
      limit: 10,
      windowSeconds: 60,
    });

    this.logger.log(`Initialized with ${this.rules.size} rules`);
  }

  getRule(ruleId: string): RateLimitRule {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new NotFoundException(`Rate limit rule not found: ${ruleId}`);
    }

    return rule;
  }
}
