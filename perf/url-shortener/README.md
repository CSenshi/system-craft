# URL Shortener Performance Tests

This directory contains performance testing infrastructure for the URL shortener application using k6, Prometheus, and Grafana.

## Prerequisites

- URL shortener app running on `localhost:3000`

## Quick Start

### 1. Setup k6

Install and configure k6 for performance testing:

```bash
pnpm nx run @perf/url-shortener:setup
```

### 2. Launch Monitoring Infrastructure

Start Grafana and Prometheus to collect and visualize metrics:

```bash
pnpm nx run @perf/url-shortener:infra:up
```

### 3. Run Performance Test

Execute the performance test suite:

```bash
pnpm nx run @perf/url-shortener:bench
```

### 4. View Results

Once the test completes, view the metrics dashboard at:
http://localhost:3333/d/00000000-0000-0000-0000-000000000000

## Test Configuration

- **Duration**: 5 minutes
- **Load Pattern**: Gradual ramp-up to 10k req/s with spikes
- **Read/Write Ratio**: 20:1 (95% reads, 5% writes)
- **Redirection Target**: <100ms
- **Availability**: 99.99%

## Metrics Tracked

- Response times (p95, p99)
- Cache hit/miss rates
- Error rates
- Throughput
- Database performance
