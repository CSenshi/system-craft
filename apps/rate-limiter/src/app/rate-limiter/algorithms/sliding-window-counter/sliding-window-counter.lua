-- Sliding Window Counter (Cloudflare-style)
-- Uses 2 periods: current and previous, with weighted counting
-- KEYS[1] = identifier, ARGV[1] = limit, ARGV[2] = windowSeconds
-- Returns: {allowed}
local identifier = KEYS[1]
local limit = tonumber(ARGV[1])
local windowSeconds = tonumber(ARGV[2])

local key = 'rate-limit-counter:' .. identifier
local now = redis.call('TIME')[1]

-- Calculate current period (like Cloudflare's sampling period)
local currentPeriod = math.floor(now / windowSeconds)
local previousPeriod = currentPeriod - 1

-- Get counts for current and previous periods
local currentCount = redis.call('HGET', key, currentPeriod) or '0'
local previousCount = redis.call('HGET', key, previousPeriod) or '0'

-- Calculate elapsed time in current period
local elapsed = now % windowSeconds

-- Cloudflare's formula: rate = previous * ((period - elapsed) / period) + current
local weightedCount = previousCount * ((windowSeconds - elapsed) / windowSeconds) + currentCount
local allowed = (weightedCount + 1) <= limit

if allowed then
    redis.call('HINCRBY', key, currentPeriod, 1)
    redis.call('HEXPIRE', key, windowSeconds, 'FIELDS', 1, currentPeriod)
end

return {allowed}