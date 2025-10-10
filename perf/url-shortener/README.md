# URL Shortener Performance Tests

## Quick Start

### 1. Build k6 with Dashboard

```bash
docker run --rm -it -e GOOS=darwin -u "$(id -u):$(id -g)" -v "${PWD}:/xk6" \
  grafana/xk6 build v0.45.1 \
  --with github.com/grafana/xk6-dashboard@latest
```

### 2. Run Performance Test

```bash
./k6 run perf/url-shortener/src/bench.js --out dashboard
```

## Test Configuration

- **Duration**: 5 minutes
- **Load Pattern**: Gradual ramp-up to 10k req/s with spikes
- **Read/Write Ratio**: 20:1 (95% reads, 5% writes)
- **Redirection Target**: <100ms
- **Availability**: 99.99%

## Metrics

- Response times (p95, p99)
- Cache hit/miss rates
- Error rates
- Throughput
- Database performance

## Prerequisites

- URL shortener app running on `localhost:3000`
