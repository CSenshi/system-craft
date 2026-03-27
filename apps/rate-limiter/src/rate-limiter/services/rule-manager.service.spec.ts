import { NotFoundException } from '@nestjs/common';
import { RuleManagerService } from './rule-manager.service';

describe('RuleManagerService', () => {
  let service: RuleManagerService;

  beforeEach(() => {
    service = new RuleManagerService();
    service.onModuleInit();
  });

  describe('getRule', () => {
    it('should return default rule with token-bucket config', () => {
      const rule = service.getRule('default');

      expect(rule).toEqual({
        algorithm: 'token-bucket',
        limit: 100,
        windowSeconds: 60,
      });
    });

    it('should return api-requests rule with high-limit token-bucket config', () => {
      const rule = service.getRule('api-requests');

      expect(rule).toEqual({
        algorithm: 'token-bucket',
        limit: 1000,
        windowSeconds: 3600,
      });
    });

    it('should return strict rule with sliding-window-log config', () => {
      const rule = service.getRule('strict');

      expect(rule).toEqual({
        algorithm: 'sliding-window-log',
        limit: 10,
        windowSeconds: 60,
      });
    });

    it('should throw NotFoundException for unknown rule ID', () => {
      expect(() => service.getRule('non-existent')).toThrow(NotFoundException);
      expect(() => service.getRule('non-existent')).toThrow(
        'Rate limit rule not found: non-existent',
      );
    });
  });
});
