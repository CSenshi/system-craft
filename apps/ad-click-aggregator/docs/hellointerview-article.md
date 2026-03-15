# Design an Ad Click Aggregator — Hello Interview

Source: https://www.hellointerview.com/learn/system-design/problem-breakdowns/ad-click-aggregator

---

## What is an Ad Click Aggregator

An Ad Click Aggregator is a system that collects and aggregates data on ad clicks. It is used by advertisers to track the performance of their ads and optimize their campaigns. For our purposes, we will assume these are ads displayed on a website or app, like Facebook.

---

## Functional Requirements

### Core Requirements

- Users can click on an ad and be redirected to the advertiser's website
- Advertisers can query ad click metrics over time with a minimum granularity of 1 minute

### Below the line (out of scope)

- Ad targeting
- Ad serving
- Cross device tracking
- Integration with offline marketing channels

---

## Non-Functional Requirements

Before we jump into our non-functional requirements, it's important to ask your interviewer about the scale of the system. For this design in particular, the scale will have a large impact on the database design and the overall architecture.

We are going to design for a system that has 10M active ads and a peak of 10k clicks per second. Since traffic varies throughout the day and 10k is our peak (not sustained) rate, the average throughput will be much lower. If we assume the average is roughly 1k clicks per second (a common heuristic is peak ≈ 10x average), that gives us about 1k \* 86,400 seconds/day ≈ 100M clicks per day.

### Core Requirements

- Scalable to support a peak of 10k clicks per second
- Low latency analytics queries for advertisers (sub-second response time)
- Fault tolerant and accurate data collection. We should not lose any click data.
- As realtime as possible. Advertisers should be able to query data as soon as possible after the click.
- Idempotent click tracking. We should not count the same click multiple times.

### Below the line (out of scope)

- Fraud or spam detection
- Demographic and geo profiling of users
- Conversion tracking

---

## The Set Up

### Planning the Approach

For this question, which is less of a user-facing product and more focused on data processing, we're going to follow the delivery framework outlined here, focusing on the system interface and the data flow.

### System Interface

For data processing questions like this one, it helps to start by defining the system's interface. This includes clearly outline what data the system receives and what it outputs, establishing a clear boundary of the system's functionality. The inputs and outputs of this system are very simple, but it's important to get these right!

- **Input**: Ad click data from users.
- **Output**: Ad click metrics for advertisers.

### Data Flow

The data flow is the sequential series of steps we'll cover in order to get from the inputs to our system to the outputs. Clarifying this flow early will help to align with our interviewer before the high-level design. For the ad click aggregator:

1. User clicks on an ad on a website.
2. The click is tracked and stored in the system.
3. The user is redirected to the advertiser's website.
4. Advertisers query the system for aggregated click metrics.

---

## High-Level Design

### 1) Users can click on ads and be redirected to the target

When a user clicks on an ad in their browser, we need to make sure that they're redirected to the advertiser's website. We'll introduce an **Ad Placement Service** which will be responsible for placing ads on the website and associating them with the correct redirect URL. Think of this as the service that decides which ad to show a user and delivers the ad creative (image, text, etc.) along with metadata like the redirect URL. We're treating it as a black box since ad targeting and serving are out of scope. We just need to know that it exists and provides the ads that users see.

When a user clicks on an ad which was placed by the Ad Placement Service, we will send a request to our `/click` endpoint, which will track the click and then redirect the user to the advertiser's website.

### 2) Advertisers can query ad click metrics over time at 1 minute intervals

Our users were successfully redirected, now let's focus on the advertisers. They need to be able to quickly query metrics about their ads to see how they're performing. We'll expand on the click processor path that we introduced above by breaking down some options for how a click is processed and stored.

Once our `/click` endpoint receives a request, the data flows into a stream (Kafka/Kinesis), is processed and aggregated by a stream processor (Flink), and the results are stored in an OLAP database (ClickHouse).

---

## Pattern: Scaling Writes

Ad click aggregation is a textbook **scaling writes** problem. We're ingesting 10k clicks per second at peak, which dwarfs the read load from advertisers querying metrics. The entire architecture (stream buffering with Kafka/Kinesis, pre-aggregation in Flink, and partitioning by AdId) is driven by the need to handle high write throughput without losing data.

---

## Potential Deep Dives

### 1) How can we scale to support 10k clicks per second?

Let's walk through each bottleneck the system could face from the moment a click is captured and how we can overcome it:

- **Click Processor Service**: We can easily scale this service horizontally by adding more instances. Most modern cloud providers like AWS, Azure, and GCP provide managed services that automatically scale services based on CPU or memory usage. We'll need a load balancer in front of the service to distribute the load across instances.

- **Stream**: Both Kafka and Kinesis are distributed and can handle a large number of events per second but need to be properly configured. Kinesis, for example, has a limit of 1MB/s or 1000 records/s per shard, so we'll need to add some sharding. Sharding by AdId is a natural choice — this way, the stream processor can read from multiple shards in parallel since they will be independent of each other (all events for a given AdId will be in the same shard).

- **Stream Processor**: The stream processor, like Flink, can also be scaled horizontally by adding more tasks or jobs. We'll have a separate Flink job reading from each shard doing the aggregation for the AdIds in that shard.

- **OLAP Database**: Managed OLAP warehouses like Snowflake or BigQuery handle scaling automatically — you don't control data placement directly. For self-managed solutions like ClickHouse, you can shard by AdvertiserId so all data for a given advertiser lives on the same node, making queries for that advertiser's ads faster. This is in anticipation of advertisers querying for all of their active ads in a single view.

#### Hot Shards

With the above scaling strategies, we should be able to handle a peak of 10k clicks per second. There is just one remaining issue: **hot shards**. Consider the case where Nike just launched a new Ad with Lebron James. This Ad is getting a lot of clicks and all of them are going to the same shard. This shard is now overwhelmed, which increases latency and, in the worst case, could even cause data loss.

To solve the hot shard problem, we need a way of further partitioning the data. One popular approach is to update the partition key by appending a random number to the AdId. We could do this only for the popular ads as determined by ad spend or previous click volume. This way, the partition key becomes `AdId:0-N` where N is the number of additional partitions for that AdId.

When writing to the OLAP database, Flink strips the suffix and uses the original AdId as the key. Since we're doing upserts with SUM aggregation, concurrent writes from different partitions combine correctly. Alternatively, you could store with sub-keys and aggregate at query time, but stripping the suffix before writing is cleaner for query performance.

---

### 2) How can we ensure that we don't lose any click data?

The first thing to note is that we are already using a stream like Kafka or Kinesis to store the click data. By default, these streams are distributed, fault-tolerant, and highly available. Kafka replicates data across multiple brokers within a cluster, and Kinesis replicates across multiple availability zones within a region. Even if a node goes down, the data is not lost. Importantly for our system, they also allow us to enable persistent storage, so even if the data is consumed by the stream processor, it is still stored in the stream for a certain period of time.

We can configure a retention period of **7 days**, for example, so that if, for some reason, our stream processor goes down, it will come back up and can read the data that it lost from the stream again.

#### Why Not Flink Checkpointing?

Stream processors like Flink also have a feature called checkpointing. This is where the processor periodically writes its state to a persistent storage like S3. If it goes down, it can read the last checkpoint and resume processing from where it left off. This is particularly useful when the aggregation windows are large, like a day or a week.

For our case, however, our aggregation windows are very small. If Flink were to go down, we would have lost, at most, a minute's worth of aggregated data. Given persistence is enabled on the stream, we can replay from a known timestamp and re-aggregate. **Checkpointing is not necessary given the small aggregation windows** — a well-studied candidate may propose it, but an experienced candidate will think critically about whether it's actually necessary.

#### Reconciliation

Click data matters, a lot. If we lose click data, we lose money. Despite our best efforts with the above measures, things could still go wrong. Transient processing errors in Flink, bad code pushes, out-of-order events in the stream, etc., could all lead to slight inaccuracies in our data. To catch these, we can introduce a **periodic reconciliation job** that runs every hour or day.

At the end of the stream, alongside the stream processors, we also dump the raw click events to a data lake like S3. Both Kafka and Kinesis support this natively — Kafka through Kafka Connect S3 Sink Connector, and Kinesis through Kinesis Data Firehose. Then we can run a periodic batch job (e.g. daily with Spark) that reads all the raw click events from the data lake and re-aggregates them. This way, we can compare the results of the batch job to the results of the stream processor and ensure that they match. If they don't, we can investigate the discrepancies and fix the root cause while updating the data in the OLAP DB with the correct values.

This essentially combines our two solutions, real-time stream processing and periodic batch processing, to ensure that our data is not only fast but also accurate. You may hear this referred to as a **Lambda architecture**. It consists of:

- A **speed layer** (Flink) for low-latency results
- A **batch layer** (Spark) for correctness — acts as source of truth that periodically corrects any inaccuracies from the speed layer

---

### 3) How can we prevent abuse from users clicking on ads multiple times?

While modern systems have advanced fraud detection systems (out of scope), we still want to enforce **ad click idempotency** — if a user clicks on an ad multiple times, we only count it as one click.

Approach: deduplicate by `(adId + userId + timestamp)` using Flink keyed state within the aggregation window.

---

### 4) How can we ensure that advertisers can query metrics at low latency?

This was largely solved by the pre-processing of the data in real-time. Whether using periodic batch processing or real-time stream processing, the data is already aggregated and stored in the OLAP database making the queries fast.

Where this query can still be slow is when aggregating over larger time windows (days, weeks, years). In this case, we can **pre-aggregate** the data in the OLAP database. This can be done by creating a new table that stores the aggregated data at a higher level of granularity, like daily or weekly, via a nightly cron job. When an advertiser queries the data, they can query the pre-aggregated table for the higher level of granularity and then drill down to the lower level if needed.

Pre-aggregating the data is a common technique to improve query performance — similar to caching. We are trading off storage space for query performance for the most common queries.

---

## Final Design Summary

```
User click
  → [Click Processor Service]  (horizontally scaled, load balanced)
       ↓
  Kafka (partitioned by AdId; hot ads: AdId:0-N; 7-day retention)
       ↓
  [Flink]  (one job per partition)
  - dedup by (adId + userId + timestamp)
  - aggregate into 1-min tumbling windows
       ↓                         ↓
  ClickHouse               S3 (raw archive via Kafka Connect)
  (pre-aggregated              ↓
   1m / 1h / 1d)         [Spark daily batch]
                          - reconcile vs ClickHouse
                          - correct discrepancies
```
