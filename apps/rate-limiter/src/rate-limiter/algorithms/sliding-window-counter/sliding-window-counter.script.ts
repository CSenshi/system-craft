// Sliding Window Counter (Cloudflare-style)
// KEYS[1] = identifier
// ARGV[1] = limit
// ARGV[2] = windowSeconds
// Returns: {allowed, remaining, resetTime}

export const SLIDING_WINDOW_COUNTER_SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local windowSeconds = tonumber(ARGV[2])
local now = redis.call('TIME')[1]

-- Calculate current period (like Cloudflare's sampling period)
local currentPeriod = math.floor(now / windowSeconds)
local previousPeriod = currentPeriod - 1

-- Get counts for current and previous periods
local currentCount = tonumber(redis.call('HGET', key, currentPeriod) or '0')
local previousCount = tonumber(redis.call('HGET', key, previousPeriod) or '0')

-- Calculate elapsed time in current period
local elapsed = now % windowSeconds

-- Cloudflare's formula: rate = previous * ((period - elapsed) / period) + current
local weightedCount = previousCount * ((windowSeconds - elapsed) / windowSeconds) + currentCount
local allowed = (weightedCount + 1) <= limit

if allowed then
    redis.call('HINCRBY', key, currentPeriod, 1)
    redis.call('HEXPIRE', key, windowSeconds, 'FIELDS', 1, currentPeriod)
    weightedCount = weightedCount + 1
end

-- Calculate return values
local remaining = math.max(0, limit - weightedCount)
local resetTime = ((currentPeriod + 1) * windowSeconds) * 1000

return {allowed and 1 or 0, remaining, resetTime}`;
