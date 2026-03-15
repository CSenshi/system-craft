# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Reference

This app follows the Hello Interview article: https://www.hellointerview.com/learn/system-design/problem-breakdowns/ad-click-aggregator
Consult it for design decisions, requirements, and architecture choices before implementing features.

## Commands

```bash
pnpm nx serve @apps/ad-click-aggregator
pnpm nx test @apps/ad-click-aggregator
pnpm nx test:int @apps/ad-click-aggregator
pnpm nx e2e @e2e/ad-click-aggregator

pnpm nx run @apps/ad-click-aggregator:infra:up
pnpm nx run @apps/ad-click-aggregator:infra:down
```

## Infrastructure

<!-- TODO: describe Docker services (databases, caches, queues) -->

## Architecture

<!-- TODO: describe key components, data flow, and design decisions -->
