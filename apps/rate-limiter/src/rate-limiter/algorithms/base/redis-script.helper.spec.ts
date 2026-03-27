import { exectRedisScriptSha } from './redis-script.helper';

describe('exectRedisScriptSha', () => {
  let redis: {
    scriptLoad: jest.Mock;
    evalSha: jest.Mock;
  };

  const script = 'return redis.call("GET", KEYS[1])';
  const keys = ['rate-limit:client-1'];
  const args = ['100', '60'];

  beforeEach(() => {
    redis = {
      scriptLoad: jest.fn().mockResolvedValue('sha-abc123'),
      evalSha: jest.fn().mockResolvedValue('result-value'),
    };
  });

  describe('script loading', () => {
    it('should load script SHA when scriptMeta.sha is null', async () => {
      const scriptMeta = { sha: null, script };

      await exectRedisScriptSha(redis as any, scriptMeta, keys, args);

      expect(redis.scriptLoad).toHaveBeenCalledWith(script);
    });

    it('should skip scriptLoad when SHA is already set', async () => {
      const scriptMeta = { sha: 'existing-sha', script };

      await exectRedisScriptSha(redis as any, scriptMeta, keys, args);

      expect(redis.scriptLoad).not.toHaveBeenCalled();
    });

    it('should persist loaded SHA on scriptMeta for reuse', async () => {
      const scriptMeta = { sha: null as string | null, script };

      await exectRedisScriptSha(redis as any, scriptMeta, keys, args);

      expect(scriptMeta.sha).toBe('sha-abc123');
    });
  });

  describe('script execution', () => {
    it('should call evalSha with loaded SHA, keys, and args', async () => {
      const scriptMeta = { sha: null, script };

      await exectRedisScriptSha(redis as any, scriptMeta, keys, args);

      expect(redis.evalSha).toHaveBeenCalledWith('sha-abc123', {
        keys,
        arguments: args,
      });
    });

    it('should return the result from evalSha', async () => {
      const scriptMeta = { sha: 'existing-sha', script };

      const result = await exectRedisScriptSha(
        redis as any,
        scriptMeta,
        keys,
        args,
      );

      expect(result).toBe('result-value');
    });
  });

  describe('NOSCRIPT error recovery', () => {
    it('should reload script and retry on NOSCRIPT error', async () => {
      const scriptMeta = { sha: 'stale-sha' as string | null, script };

      redis.evalSha
        .mockRejectedValueOnce(new Error('NOSCRIPT No matching script'))
        .mockResolvedValueOnce('recovered-value');
      redis.scriptLoad.mockResolvedValue('new-sha');

      const result = await exectRedisScriptSha(
        redis as any,
        scriptMeta,
        keys,
        args,
      );

      expect(result).toBe('recovered-value');
      expect(redis.scriptLoad).toHaveBeenCalledWith(script);
      expect(redis.evalSha).toHaveBeenCalledTimes(2);
    });

    it('should update scriptMeta.sha after NOSCRIPT recovery', async () => {
      const scriptMeta = { sha: 'stale-sha' as string | null, script };

      redis.evalSha
        .mockRejectedValueOnce(new Error('NOSCRIPT No matching script'))
        .mockResolvedValueOnce('ok');
      redis.scriptLoad.mockResolvedValue('fresh-sha');

      await exectRedisScriptSha(redis as any, scriptMeta, keys, args);

      expect(scriptMeta.sha).toBe('fresh-sha');
    });
  });

  describe('non-NOSCRIPT errors', () => {
    it('should re-throw non-NOSCRIPT errors without retry', async () => {
      const scriptMeta = { sha: 'existing-sha', script };

      redis.evalSha.mockRejectedValue(new Error('WRONGTYPE Operation'));

      await expect(
        exectRedisScriptSha(redis as any, scriptMeta, keys, args),
      ).rejects.toThrow('WRONGTYPE Operation');

      expect(redis.scriptLoad).not.toHaveBeenCalled();
      expect(redis.evalSha).toHaveBeenCalledTimes(1);
    });
  });
});
