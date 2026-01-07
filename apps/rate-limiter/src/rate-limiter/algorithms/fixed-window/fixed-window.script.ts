// Lua script that handles all rate limiting logic atomically
// KEYS[1] = base key (rate-limit:{identifier})
// ARGV[1] = limit (max requests)
// ARGV[2] = windowSeconds (time window in seconds)
// Returns: {resetTime, allowed, remaining}

export const FIXED_WINDOW_SCRIPT = `
local baseKey = KEYS[1]
local limit = tonumber(ARGV[1])
local windowSeconds = tonumber(ARGV[2])

-- Calculate window start from current time
local now = redis.call('TIME')[1]
local windowStart = math.floor(now / windowSeconds) * windowSeconds

-- Construct full key with window start
local key = baseKey .. ':' .. windowStart

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

return {resetTime, allowed and 1 or 0, remaining}`;
