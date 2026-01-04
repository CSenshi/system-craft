import type { RedisClusterType } from 'redis';

/**
 * Executes a Redis Lua script with automatic error recovery.
 * Handles NOSCRIPT errors by reloading the script and retrying.
 */
export async function exectRedisScriptSha<T>(
  redis: RedisClusterType,
  scriptMeta: { sha: string | null; script: string },
  keys: string[],
  args: string[],
): Promise<T> {
  // Load script SHA if not already loaded
  if (!scriptMeta.sha) {
    scriptMeta.sha = await redis.scriptLoad(scriptMeta.script);
  }

  try {
    return (await redis.evalSha(scriptMeta.sha, {
      keys,
      arguments: args,
    })) as T;
  } catch (error: unknown) {
    // Handle NOSCRIPT error - script was flushed from Redis
    if ((error as Error)?.message?.includes('NOSCRIPT')) {
      scriptMeta.sha = null;
      scriptMeta.sha = await redis.scriptLoad(scriptMeta.script);

      return (await redis.evalSha(scriptMeta.sha, {
        keys,
        arguments: args,
      })) as T;
    }

    // Re-throw if it's not a NOSCRIPT error
    throw error;
  }
}
