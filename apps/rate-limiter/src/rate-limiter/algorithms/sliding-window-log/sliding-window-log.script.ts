// Lua script for Sliding Window Log algorithm using Redis Hash
// KEYS[1] = identifier
// ARGV[1] = limit (max requests)
// ARGV[2] = windowSeconds (time window in seconds)
// Returns: {allowed, remaining, resetTime}

export const SLIDING_WINDOW_LOG_SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local windowSeconds = tonumber(ARGV[2])

-- Count current requests in the window (only non-expired fields remain)
-- Note: HEXPIRE automatically removes expired fields, so HLEN only counts active requests
local currentCount = redis.call('HLEN', key)
    
-- Check if request should be allowed
local allowed = currentCount < limit

local time = redis.call('TIME')
local now = time[1]

if allowed then
    -- Generate unique field key using precise timestamp
    local fieldKey = now + (time[2] / 1000000)

    -- Add request to hash (value is empty string, only the field key matters)
    redis.call('HSET', key, fieldKey, '')

    -- Set expiration on the individual field
    redis.call('HEXPIRE', key, windowSeconds, 'FIELDS', 1, fieldKey)
end

-- Calculate return values
local finalCount = allowed and (currentCount + 1) or currentCount
local remaining = math.max(0, limit - finalCount)
local resetTime = (now + windowSeconds) * 1000

-- Return all values as a table
return {allowed and 1 or 0, remaining, resetTime}`;
