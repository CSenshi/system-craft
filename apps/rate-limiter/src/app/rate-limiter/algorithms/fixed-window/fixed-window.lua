-- Lua script that handles all rate limiting logic atomically
-- KEYS[1] = identifier
-- ARGV[1] = limit (max requests)
-- ARGV[2] = windowSeconds (time window in seconds)
-- Returns: {resetTime, allowed, remaining}
local identifier = KEYS[1]
local limit = tonumber(ARGV[1])
local windowSeconds = tonumber(ARGV[2])

-- Calculate window start
local now = redis.call('TIME')[1]
local windowStart = math.floor(now / windowSeconds) * windowSeconds

-- Build Redis key
local key = 'rate-limit:' .. identifier .. ':' .. windowStart

-- Increment counter
local count = redis.call('INCR', key)

-- Set TTL if this is the first request in the window
if count == 1 then
    redis.call('EXPIRE', key, windowSeconds)
end

-- Calculate return values
local resetTime = (windowStart + windowSeconds) * 1000
local allowed = count <= limit
local remaining = math.max(0, limit - count)

return {resetTime, allowed, remaining}
