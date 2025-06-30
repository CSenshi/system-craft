# Contributing to System Craft

Welcome! 🎉 Thank you for your interest in contributing to **System Craft**. This project is a monorepo of backend system design implementations, built with [Nx](https://nx.dev/), [NestJS](https://nestjs.com/), and [pnpm](https://pnpm.io/).

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Style, Linting & Formatting](#code-style--linting)
- [Testing](#testing)
- [Branching & Pull Requests](#branching--pull-requests)
- [Adding New Systems/Apps](#adding-new-systemsapps)
- [Nx & Monorepo Guidelines](#nx--monorepo-guidelines)
- [Commit Messages](#commit-messages)
- [Issue & PR Templates](#issue--pr-templates)
- [Code Review Process](#code-review-process)
- [Resources](#resources)

---

## Code of Conduct
Please be respectful and inclusive. See [Contributor Covenant](https://www.contributor-covenant.org/) for general guidelines.

## Getting Started
1. **Fork & Clone** the repository.
2. **Install dependencies:**
   ```bash
   pnpm install
   ```
3. **Copy environment files** (if needed):
   ```bash
   cp apps/<project>/.env.example apps/<project>/.env
   ```
4. **Start required services:**
   ```bash
   pnpm nx run @apps/<project>:infra:up
   ```
5. **Start the development server:**
   ```bash
   pnpm nx run @apps/<project>:serve
   ```
> Replace `<project>` with the name of the app you want to work on (e.g., 
`url-shortener`)

> For project-specific setup or launch steps (such as database migrations), check the README in the relevant app directory (e.g., `apps/<project>/README.md`).

## Project Structure
- `apps/` – Main applications (e.g., `url-shortener`)
- `libs/` – Shared libraries (e.g., `shared`)
- `e2e/` – End-to-end tests for each app
- `.github/` – GitHub workflows, instructions, and templates

## Development Workflow
- Use [Nx Console](https://nx.dev/nx-console) or CLI for running tasks.
- Prefer `pnpm` for all package management.
- Use Nx targets for building, testing, linting, and serving apps.
- See `.github/instructions/nx.instructions.md` for Nx-specific flows and automation.

## Code Style, Linting & Formatting
- Follow the existing ESLint and Prettier configuration. TypeScript is required for all code.
- Before committing, run:
  ```bash
  pnpm nx lint <project>
  pnpm nx format:write --all
  ```

## Testing
- **Unit tests:**
  ```bash
  pnpm nx test <project>
  ```
- **Integration tests:**
  ```bash
  pnpm nx test:int <project>
  ```
- **E2E tests:**
  ```bash
  pnpm nx e2e <project>
  ```
- Add/maintain tests for new features and bug fixes.

## Branching & Pull Requests
- Use feature branches: `feature/<short-description>`
- Reference issues in your PRs when applicable.
- Write clear, descriptive PR titles and descriptions.
- Ensure your branch is up to date with `main` before opening a PR.
- All PRs require review and must pass CI checks.

## Adding New Systems/Apps
- Each new system should be added as a new app in `apps/`.
- Use Nx generators when possible:
  ```bash
  pnpm nx generate @nx/nest:application <name>
  ```
- Add a README in the new app's directory.
- Update the root README with your new system.

## Nx & Monorepo Guidelines
- Use Nx targets for all tasks (build, test, lint, serve, etc.).
- Prefer using the Nx Console or CLI for workspace management.
- See `.github/instructions/nx.instructions.md` for detailed Nx flows and best practices.
- Keep shared logic in `libs/shared`.
- Use dependency graphs to understand project relationships:
  ```bash
  pnpm nx graph
  ```

## Commit Messages
- Use clear, concise commit messages.
- Conventional Commits are encouraged (e.g., `feat(web-crawler): add cache`, `fix(url-shortener): correct url validation`).

## Issue & PR Templates
- Use the provided templates when opening issues or pull requests.
- Provide as much context as possible.

## Code Review Process
- All code is reviewed for clarity, maintainability, and test coverage.
- Be open to feedback and willing to revise your code.

## Resources
- [Nx Documentation](https://nx.dev/)
- [NestJS Documentation](https://docs.nestjs.com/)


---

Thank you for helping make System Craft better! 🚀 