import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { IRateLimitAlgorithm } from '../algorithms/base';
import { FixedWindowAlgorithm } from '../algorithms/fixed-window';
import { SlidingWindowCounterAlgorithm } from '../algorithms/sliding-window-counter';
import { SlidingWindowLogAlgorithm } from '../algorithms/sliding-window-log';
import { TokenBucketAlgorithm } from '../algorithms/token-bucket';
import { AlgorithmType } from '../rate-limiter.types';

/**
 * Service for managing rate limiting algorithms.
 * Provides centralized access to algorithm instances by type.
 */
@Injectable()
export class AlgorithmManagerService implements OnModuleInit {
  private readonly logger = new Logger(AlgorithmManagerService.name);
  private readonly algorithms = new Map<AlgorithmType, IRateLimitAlgorithm>();

  constructor(
    private readonly fixedWindow: FixedWindowAlgorithm,
    private readonly slidingWindowLog: SlidingWindowLogAlgorithm,
    private readonly slidingWindowCounter: SlidingWindowCounterAlgorithm,
    private readonly tokenBucket: TokenBucketAlgorithm,
  ) {}

  onModuleInit() {
    this.algorithms.set('fixed-window', this.fixedWindow);
    this.algorithms.set('sliding-window-log', this.slidingWindowLog);
    this.algorithms.set('sliding-window-counter', this.slidingWindowCounter);
    this.algorithms.set('token-bucket', this.tokenBucket);

    this.logger.log(`Initialized with ${this.algorithms.size} algorithms`);
  }

  getAlgorithm(algorithmType: AlgorithmType): IRateLimitAlgorithm {
    const algorithm = this.algorithms.get(algorithmType);
    if (!algorithm) {
      throw new NotFoundException(
        `Rate limiting algorithm not found: ${algorithmType}`,
      );
    }
    return algorithm;
  }
}
