# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Reference

This app follows the Hello Interview article: https://www.hellointerview.com/learn/system-design/problem-breakdowns/ad-click-aggregator
The full article is saved at [docs/hellointerview-article.md](docs/hellointerview-article.md) — read it for design decisions, deep dives, and architecture rationale.

## Commands

```bash
pnpm nx serve @apps/ad-click-aggregator
pnpm nx test @apps/ad-click-aggregator
pnpm nx test:int @apps/ad-click-aggregator
pnpm nx e2e @e2e/ad-click-aggregator

pnpm nx run @apps/ad-click-aggregator:infra:up
pnpm nx run @apps/ad-click-aggregator:infra:down
```

## Requirements

### Functional (in scope)

- Users can click on an ad and be redirected to the advertiser's website
- Advertisers can query ad click metrics over time with a minimum granularity of 1 minute

### Functional (out of scope)

- Ad targeting and ad serving
- Cross-device tracking
- Integration with offline marketing channels

### Non-Functional (in scope)

- **Scale**: 10M active ads; peak 10k clicks/s; average ~1k clicks/s (~100M clicks/day)
- **Scalable**: horizontally scale to support peak write throughput
- **Low-latency reads**: sub-second analytics query response for advertisers
- **Fault-tolerant**: no click data is ever lost
- **Real-time**: advertisers can query data as soon as possible after a click
- **Idempotent**: the same click must never be counted more than once

### Non-Functional (out of scope)

- Fraud and spam detection
- Demographic and geo profiling
- Conversion tracking

## API

```
POST /click
Body: { adId, userId, timestamp }
→ Records click event; redirects user to advertiser URL

GET /metrics
Query: adId, startTime, endTime, granularity (1m|1h|1d)
→ Returns pre-aggregated click counts for the given window
```

## Data Models

### Click Event (Kafka message / S3 raw archive)

```
adId        string
userId      string
timestamp   ISO8601
```

### Aggregated Metric (ClickHouse)

```
adId        string
windowStart timestamp
windowEnd   timestamp
granularity enum(1m, 1h, 1d)
clickCount  int64
```

## Infrastructure

All services run locally via **Docker Compose**:

- **Kafka** — click event stream; partitioned by AdId; 7-day retention for replay
- **Apache Flink** — stateful stream processor; aggregates clicks into 1-min tumbling windows; reads from Kafka partitions in parallel
- **ClickHouse** — columnar OLAP store for pre-aggregated metrics; sharded by AdvertiserId
- **S3 (local volume)** — raw click event archive via Kafka Connect S3 Sink; used by reconciliation batch job

## Architecture

### Click Flow

```
User click
  → [Click Processor Service]  (horizontally scaled, load balanced)
       ↓ async
  Kafka topic: ad-clicks       (partitioned by AdId; hot ads use AdId:0-N suffix)
       ↓
  [Flink Stream Processor]     (one job per Kafka partition)
  - dedup by (adId + userId + timestamp)
  - aggregate into 1-min tumbling windows
  - emit: adId × windowStart → clickCount
       ↓                              ↓
  ClickHouse (hot queries)       S3 (raw archive)
                                      ↓
                              [Spark Batch Job]  (daily reconciliation)
                              - re-aggregates raw events
                              - diffs vs ClickHouse
                              - corrects any discrepancies
```

### Lambda Architecture

| Layer         | Technology | Purpose                                               |
| ------------- | ---------- | ----------------------------------------------------- |
| Speed layer   | Flink      | Low-latency, near-real-time aggregation               |
| Batch layer   | Spark      | Daily reconciliation; source of truth for correctness |
| Serving layer | ClickHouse | Pre-aggregated metrics for advertiser queries         |

### Key Design Decisions

| Decision             | Choice                                                    | Reason                                                                       |
| -------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Ingestion buffer     | Kafka (7-day retention)                                   | Absorbs 10k click/s bursts; durable; enables replay if Flink goes down       |
| Kafka partitioning   | By AdId                                                   | All events for an AdId go to one shard; Flink jobs are independent per shard |
| Hot shard mitigation | Append random suffix (AdId:0-N) for viral ads             | Spreads load; Flink strips suffix before writing to ClickHouse               |
| Fault tolerance      | Kafka replay, not Flink checkpointing                     | 1-min windows are tiny; losing a window is cheap to replay from stream       |
| Correctness          | Daily Spark reconciliation vs ClickHouse                  | Catches transient Flink errors, bad deploys, out-of-order events             |
| Idempotency          | Dedup by (adId + userId + timestamp) in Flink keyed state | Prevents counting the same click twice                                       |
| Query performance    | Pre-aggregate 1m → 1h → 1d via nightly cron               | Trades storage for sub-second latency on large time ranges                   |
| OLAP sharding        | By AdvertiserId                                           | Advertiser dashboard queries (all ads for one advertiser) hit one node       |
