# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Reference

This app follows the Hello Interview article: https://www.hellointerview.com/learn/system-design/problem-breakdowns/distributed-rate-limiter
Consult it for design decisions, algorithm trade-offs, and requirements before implementing features.

## Commands

```bash
pnpm nx serve @apps/rate-limiter            # Start dev server
pnpm nx test @apps/rate-limiter             # Unit tests
pnpm nx test:int @apps/rate-limiter         # Integration tests
pnpm nx e2e @e2e/rate-limiter               # E2E tests

pnpm nx run @apps/rate-limiter:infra:up     # Start Redis Cluster (Docker)
pnpm nx run @apps/rate-limiter:infra:down
```

## Infrastructure

- **Redis Cluster** (single-node for local dev) — all rate limit state lives here
- Atomic operations via **Redis Lua scripts** to prevent race conditions

## Architecture

### Algorithms

Four implementations, each in its own module:

| Algorithm                  | Trade-off                                                    |
| -------------------------- | ------------------------------------------------------------ |
| **Fixed Window**           | Simple O(1), but allows 2x burst at window boundary          |
| **Sliding Window Log**     | Accurate, stores per-request timestamps in Redis             |
| **Sliding Window Counter** | Cloudflare-style weighted counter — balanced accuracy/memory |
| **Token Bucket**           | Allows controlled bursts; tokens refill at constant rate     |

Each algorithm has a corresponding `<algorithm>.script.ts` file containing the Redis Lua script for atomic execution.

### Key Abstractions

- `RateLimitAlgorithm` — base interface all algorithms implement
- `RedisScriptHelper` — manages Lua script loading and execution
- `@RateLimit()` decorator — apply rate limiting to any route
- Client identified by user ID, API key, or IP address

### Response Headers

All rate-limited responses include:

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
