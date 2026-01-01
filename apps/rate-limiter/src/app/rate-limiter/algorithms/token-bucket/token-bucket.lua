-- Token Bucket algorithm using Redis Hash
-- KEYS[1] = identifier
-- ARGV[1] = limit (bucket capacity)
-- ARGV[2] = windowSeconds (time to refill bucket completely)
-- Returns: {allowed, remaining, resetTime}
local identifier = KEYS[1]
local limit = tonumber(ARGV[1])
local windowSeconds = tonumber(ARGV[2])

local key = 'rate-limit-bucket:' .. identifier
local now = redis.call('TIME')[1]

-- Get current bucket state
local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
local tokens = tonumber(bucket[1]) or limit
local lastRefill = tonumber(bucket[2]) or now

-- Calculate refill rate (tokens per second)
local refillRate = limit / windowSeconds

-- Calculate time elapsed since last refill
local elapsed = now - lastRefill

-- Refill tokens based on elapsed time (but don't exceed limit)
if elapsed > 0 then
    local tokensToAdd = elapsed * refillRate
    tokens = math.min(limit, tokens + tokensToAdd)
    lastRefill = now
end

-- Check if request can be allowed (needs 1 token)
local allowed = tokens >= 1

if allowed then
    tokens = tokens - 1
end

-- Update bucket state atomically (always update to save refill time)
redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
redis.call('EXPIRE', key, windowSeconds * 2)  -- Expire after 2x window for cleanup

-- Calculate return values
local remaining = tokens
local resetTime = (now + (limit - tokens) / refillRate) * 1000

return {allowed, remaining, resetTime}

