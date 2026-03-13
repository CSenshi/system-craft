# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Reference

This app follows the Hello Interview article: https://www.hellointerview.com/learn/system-design/problem-breakdowns/web-crawler
Consult it for design decisions, requirements, and architecture choices before implementing features.

## Commands

```bash
pnpm nx serve @apps/web-crawler             # Start dev server
pnpm nx test @apps/web-crawler              # Unit tests
pnpm nx test:int @apps/web-crawler          # Integration tests
pnpm nx e2e @e2e/web-crawler                # E2E tests

pnpm nx run @apps/web-crawler:infra:up      # Start LocalStack (Docker)
pnpm nx run @apps/web-crawler:infra:down
pnpm nx run @apps/web-crawler:sqs:test-message  # Push test message to queue
pnpm nx run @apps/web-crawler:sqs:clear         # Clear queues
pnpm nx run @apps/web-crawler:sqs:list-dlq      # Inspect dead-letter queue
```

## Infrastructure

All AWS services run locally via **LocalStack** (Docker):

- **SQS** — two queues: Content Discovery Queue + Content Processing Queue
- **S3** — stores raw crawled content
- **DynamoDB** — tracks crawl metadata and state

## Architecture

### Message Flow

```
seed URL → [Content Discovery Queue]
               ↓ consumer
          ContentDownloader (axios)
          DnsResolver (round-robin)
          UrlExtractor (jsdom)
               ↓
    extracted URLs → [Content Discovery Queue]  (recursive)
    raw content   → [Content Processing Queue]
                          ↓ consumer
                     ContentRepository (S3)
                     CrawlMetadataRepository (DynamoDB)
```

### Key Services

- `ContentDownloader` — fetches page HTML via axios
- `DnsResolver` — round-robin DNS resolution across IPs
- `UrlExtractor` — parses HTML with jsdom, extracts absolute URLs
- `ContentRepository` — writes raw content to S3
- `CrawlMetadataRepository` — tracks crawl state (visited, pending) in DynamoDB

### NestJS Microservice

Uses `@ssut/nestjs-sqs` for SQS consumer/producer integration. Validation at queue boundaries uses **Zod** (not `class-validator`).
