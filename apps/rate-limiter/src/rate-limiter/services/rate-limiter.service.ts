import { Injectable } from '@nestjs/common';
import { RateLimitResult } from '../rate-limiter.types';
import { AlgorithmManagerService } from './algorithm-manager.service';
import { RuleManagerService } from './rule-manager.service';

/**
 * Main service for rate limiting operations.
 *
 * This service coordinates between rate limiting algorithms, rules and client identification.
 * ```
 */
@Injectable()
export class RateLimiterService {
  constructor(
    private readonly ruleManager: RuleManagerService,
    private readonly algorithmManager: AlgorithmManagerService,
  ) {}

  async check(clientId: string, ruleId: string): Promise<RateLimitResult> {
    const rule = this.ruleManager.getRule(ruleId);
    const algo = this.algorithmManager.getAlgorithm(rule.algorithm);
    return await algo.increment(clientId, rule);
  }
}
