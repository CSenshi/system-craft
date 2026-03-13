Generate a new NestJS app in this Nx monorepo.

Usage: /new-app <name>

Steps:

1. Run: `pnpm nx g @nx/nest:application --directory apps/$ARGUMENTS --unitTestRunner jest --linter eslint`
2. After generation, create `apps/$ARGUMENTS/CLAUDE.md` using the template below — fill in the `<name>` placeholder and leave the article URL blank for the user to fill in.

CLAUDE.md template:

```
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Reference

This app follows the Hello Interview article: <!-- TODO: add article URL -->
Consult it for design decisions, requirements, and architecture choices before implementing features.

## Commands

\`\`\`bash
pnpm nx serve @apps/<name>
pnpm nx test @apps/<name>
pnpm nx test:int @apps/<name>
pnpm nx e2e @e2e/<name>

pnpm nx run @apps/<name>:infra:up
pnpm nx run @apps/<name>:infra:down
\`\`\`

## Infrastructure

<!-- TODO: describe Docker services (databases, caches, queues) -->

## Architecture

<!-- TODO: describe key components, data flow, and design decisions -->
```
