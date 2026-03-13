# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Reference

This app follows the Hello Interview article: https://www.hellointerview.com/learn/system-design/problem-breakdowns/bitly
Consult it for design decisions, requirements, and architecture choices before implementing features.

## Commands

```bash
pnpm nx serve @apps/url-shortener           # Start dev server
pnpm nx test @apps/url-shortener            # Unit tests
pnpm nx test:int @apps/url-shortener        # Integration tests
pnpm nx e2e @e2e/url-shortener              # E2E tests

pnpm nx run @apps/url-shortener:infra:up    # Start PostgreSQL + Redis (Docker)
pnpm nx run @apps/url-shortener:infra:down
pnpm nx run @apps/url-shortener:prisma-deploy  # Run DB migrations
pnpm nx run @apps/url-shortener:docker-build
```

## Infrastructure

- **PostgreSQL 17** — primary storage via Prisma (`ShortendUrls` table: `id`, `url`)
- **Redis Stack** — cache layer for hot URL lookups
- Both run via Docker Compose

## Architecture

### URL Shortening Strategy

Short codes are generated via a **counter + Base62 bijection encoding**:

1. A counter (Redis or Postgres) provides a monotonically increasing integer
2. The integer is encoded to a Base62 short code (prevents sequential/guessable URLs)

Four counter strategy implementations exist — pick via DI:

- `RedisCounterService` — single atomic `INCR`
- `RedisBatchCounterService` — batch reservation (fewer round trips)
- `PostgresCounterService` — DB-backed single increment
- `PostgresBatchCounterService` — DB-backed batch reservation

### Caching

Cache-aside pattern: on redirect, check Redis first; on miss, query Postgres and populate cache.

### Endpoints

- `POST /url` — shorten a URL
- `GET /l/:shortCode` — redirect to original URL
