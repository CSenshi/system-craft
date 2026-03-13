# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Educational monorepo implementing production-grade system design patterns. Three independent NestJS apps, each demonstrating a different system design problem. Each app has its own `CLAUDE.md` with app-specific details.

## Commands

```bash
pnpm nx serve @apps/<app-name>          # Start dev server
pnpm nx build @apps/<app-name>          # Build
pnpm nx lint @apps/<app-name>           # Lint
pnpm nx typecheck @apps/<app-name>      # Type check
pnpm nx format:write --files            # Format all files

pnpm nx test @apps/<app-name>           # Unit tests
pnpm nx test:int @apps/<app-name>       # Integration tests
pnpm nx e2e @e2e/<app-name>             # E2E tests

pnpm nx run @apps/<app-name>:infra:up   # Start Docker services
pnpm nx run @apps/<app-name>:infra:down # Stop Docker services
```

App names: `url-shortener`, `rate-limiter`, `web-crawler`

## Architecture

### CQRS + Domain-Driven Design

All apps follow the same folder structure:

```
apps/<app>/src/
├── <domain>/
│   ├── commands/<command>/     # Write ops: service + controller + DTOs + index.ts
│   ├── queries/<query>/        # Read ops:  service + controller + DTOs + index.ts
│   ├── repositories/           # Data access abstraction
│   └── <domain>.module.ts
└── app.module.ts
```

### Shared Library (`libs/shared`)

Base classes used across all apps:

- `BaseCommand<T, R>`, `BaseQuery<T, R>`, `BaseEvent` — CQRS primitives via `@nestjs-architects/typed-cqrs`
- `AggregateRoot`, `ValueObject` — DDD building blocks
- `BaseDto`, `BaseException` — common response/error types

### Testing Conventions

- Unit tests: `*.spec.ts` (alongside source)
- Integration tests: `*.int.spec.ts` (alongside source)
- Each app has `jest.config.ts` (unit only) and `jest.int.config.ts` (integration only)
- Transform: SWC (`@swc/jest`) for speed
