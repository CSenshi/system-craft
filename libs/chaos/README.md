# @libs/chaos — Chaos Engineering & Resilience Testing

A shared library for testing how System Craft apps handle infrastructure failures using [Toxiproxy](https://github.com/Shopify/toxiproxy).

## What is Chaos Engineering?

Chaos engineering is the discipline of experimenting on a system to build confidence in its ability to withstand turbulent conditions in production. Instead of waiting for outages to reveal weaknesses, we **proactively inject failures** and verify that the system degrades gracefully.

This is the #1 senior-level interview topic: **fault tolerance and graceful degradation**.

## How Toxiproxy Works

```
App ──→ Toxiproxy ──→ Redis / Postgres / LocalStack
              │
         Inject faults:
         - Connection drop (disable proxy)
         - Latency (100ms–10s)
         - Bandwidth limit (KB/s)
         - Timeout (hang connection)
         - Data corruption (slicer)
```

Toxiproxy is a TCP proxy that sits between your app and its infrastructure. It exposes a REST API (port 8474) to inject "toxics" — configurable failure modes — into the connection.

Each app's `docker-compose.chaos.yml` starts Toxiproxy alongside the real infrastructure. The chaos tests configure proxies and inject faults via the `ToxiproxyClient`.

## Running Chaos Tests

### Prerequisites

- Docker and Docker Compose
- Node.js 18+

### Run for a specific app

```bash
pnpm nx run @apps/url-shortener:chaos
pnpm nx run @apps/rate-limiter:chaos
pnpm nx run @apps/web-crawler:chaos
```

Each command will:

1. Start the chaos Docker Compose (infra + Toxiproxy)
2. Run the chaos test suite (Jest, serial execution)
3. Print the resilience report to stdout
4. Tear down the Docker Compose

### Run manually (for debugging)

```bash
# Start infra with Toxiproxy
cd apps/url-shortener
docker compose -f docker-compose.chaos.yml up -d

# Run tests
npx jest --config jest.chaos.config.ts --runInBand

# Tear down
docker compose -f docker-compose.chaos.yml down
```

## Architecture

### Library Structure

```
libs/chaos/src/
├── toxiproxy/
│   ├── client.ts       # ToxiproxyClient — typed HTTP client for Toxiproxy REST API
│   └── types.ts        # Proxy, Toxic, ToxicConfig interfaces
├── scenarios/
│   └── scenario.ts     # ChaosScenario and ChaosScenarioResult types
├── report/
│   └── reporter.ts     # Markdown resilience report generator
├── helpers/
│   └── wait-for-service.ts  # Health check polling utilities
└── index.ts            # Public exports
```

### Key Abstractions

**ToxiproxyClient** — wraps the Toxiproxy REST API:

```typescript
const toxi = new ToxiproxyClient('http://localhost:8474');

// Create a proxy
await toxi.createProxy({ name: 'redis', listen: '0.0.0.0:6380', upstream: 'redis:6379' });

// Inject a fault
await toxi.addToxic('redis', { name: 'slow', type: 'latency', attributes: { latency: 500 } });

// Simulate total outage
await toxi.disableProxy('redis');

// Restore
await toxi.enableProxy('redis');

// Clean up all toxics
await toxi.resetProxy('redis');
```

**runScenario** — executes a chaos scenario and records timing/results:

```typescript
import { createReportCollector, runScenario } from '@libs/chaos';

const report = createReportCollector('My App');

it('should handle Redis outage', async () => {
  await toxi.disableProxy('redis');

  await runScenario(report, 'Redis down', async () => {
    const res = await request(app.getHttpServer()).get('/endpoint');
    if (res.status === 200) {
      return { passed: true, graceful: true, notes: 'Handled gracefully' };
    }
    return { passed: false, graceful: false, notes: `Got ${res.status}` };
  });
});
```

Errors thrown inside the scenario function are caught and recorded as failures — they won't crash the Jest suite.

**Report Collector** — aggregates results and generates markdown:

```typescript
const report = createReportCollector('My App');
report.record({ scenario: 'Redis down', passed: false, graceful: false, ... });
console.log(generateReport([report.toReport()]));
```

## Adding New Scenarios

### 1. Define the scenario in your chaos test file

```typescript
it('should handle [failure description]', async () => {
  // Inject fault
  await toxi.addToxic('proxy-name', {
    name: 'my-toxic',
    type: 'latency', // or: timeout, bandwidth, limit_data, slow_close, slicer
    stream: 'downstream', // or: upstream
    attributes: { latency: 1000 },
  });

  // Exercise the system
  const res = await request(app.getHttpServer()).get('/endpoint');

  // Assert expected behavior
  expect(res.status).toBe(200); // or whatever graceful degradation looks like
});
```

### 2. Available toxic types

| Type         | Attributes                       | Effect                          |
| ------------ | -------------------------------- | ------------------------------- |
| `latency`    | `latency` (ms), `jitter` (ms)    | Adds delay to data              |
| `bandwidth`  | `rate` (KB/s)                    | Limits throughput               |
| `timeout`    | `timeout` (ms)                   | Stops data after timeout        |
| `slow_close` | `delay` (ms)                     | Delays TCP close                |
| `slicer`     | `average_size`, `size_variation` | Slices data into small chunks   |
| `limit_data` | `bytes`                          | Closes connection after N bytes |

### 3. Disable proxy for total outage

```typescript
await toxi.disableProxy('redis'); // simulate total failure
await toxi.enableProxy('redis'); // restore connection
```

## Reading the Resilience Report

After tests run, a markdown report is printed:

```
# Resilience Report — System Craft
Generated: 2026-03-17T...

## URL Shortener
| Scenario | Result | Graceful? | Recovery | Duration | Notes |
|----------|--------|-----------|----------|----------|-------|
| Redis cache down | FAIL | NO | n/a | 150ms | cacheManager.get() threw unhandled |
| Postgres down | PASS | YES | n/a | 50ms | Returns 500 as expected |

## Summary
- Total scenarios: 17
- Passed: 12
- Failed: 5
- Resilience score: 12/17 (71%)
```

- **PASS**: System behaved as expected under failure
- **FAIL**: System exhibited unexpected/unhandled behavior
- **Graceful**: System degraded gracefully (e.g., fallback, fail-open) vs crashed
- **Recovery**: Whether the system auto-recovered after restoration
