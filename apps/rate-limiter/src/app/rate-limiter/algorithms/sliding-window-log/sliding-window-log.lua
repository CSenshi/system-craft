-- Lua script for Sliding Window Log algorithm using Redis Hash + HEXPIRE
-- KEYS[1] = identifier
-- ARGV[1] = limit (max requests)
-- ARGV[2] = windowSeconds (time window in seconds)
-- Returns: {allowed, remaining}
local identifier = KEYS[1]
local limit = tonumber(ARGV[1])
local windowSeconds = tonumber(ARGV[2])

-- Build Redis key for hash
local key = 'rate-limit-log:' .. identifier

-- Count current requests in the window (only non-expired fields remain)
-- Note: HEXPIRE automatically removes expired fields, so HLEN only counts active requests
local currentCount = redis.call('HLEN', key)

-- Check if request should be allowed
local allowed = currentCount < limit

if allowed then
    -- Generate unique field key using precise timestamp
    local time = redis.call('TIME')
    local nowPrecise = tonumber(time[1]) + (tonumber(time[2]) / 1000000)
    local fieldKey = tostring(nowPrecise)

    -- Add request to hash (value is empty string, only the field key matters)
    redis.call('HSET', key, fieldKey, '')

    -- Set expiration on the individual field
    redis.call('HEXPIRE', key, windowSeconds, 'FIELDS', 1, fieldKey)
end

-- Calculate remaining requests
local finalCount = allowed and (currentCount + 1) or currentCount
local remaining = math.max(0, limit - finalCount)

-- Return all values as a table
return {allowed, remaining}
