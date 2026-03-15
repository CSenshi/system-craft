-- 1-minute aggregates (written by Flink)
CREATE TABLE IF NOT EXISTS ad_clicks_1m (
    adId        String,
    windowStart DateTime,
    windowEnd   DateTime,
    clickCount  Int64
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(windowStart)
ORDER BY (adId, windowStart);

-- Hourly aggregates (rolled up via materialized view from 1m)
CREATE TABLE IF NOT EXISTS ad_clicks_1h (
    adId        String,
    windowStart DateTime,
    windowEnd   DateTime,
    clickCount  Int64
) ENGINE = SummingMergeTree(clickCount)
PARTITION BY toYYYYMM(windowStart)
ORDER BY (adId, windowStart);

-- Daily aggregates (rolled up via materialized view from 1m)
CREATE TABLE IF NOT EXISTS ad_clicks_1d (
    adId        String,
    windowStart Date,
    windowEnd   Date,
    clickCount  Int64
) ENGINE = SummingMergeTree(clickCount)
PARTITION BY toYear(windowStart)
ORDER BY (adId, windowStart);

-- Materialized view: 1m → 1h
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_ad_clicks_1h
TO ad_clicks_1h AS
SELECT
    adId,
    toStartOfHour(windowStart)          AS windowStart,
    addHours(toStartOfHour(windowStart), 1) AS windowEnd,
    sum(clickCount)                     AS clickCount
FROM ad_clicks_1m
GROUP BY adId, windowStart, windowEnd;

-- Materialized view: 1m → 1d
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_ad_clicks_1d
TO ad_clicks_1d AS
SELECT
    adId,
    toDate(windowStart)                 AS windowStart,
    addDays(toDate(windowStart), 1)     AS windowEnd,
    sum(clickCount)                     AS clickCount
FROM ad_clicks_1m
GROUP BY adId, windowStart, windowEnd;
