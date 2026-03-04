# HaakCo Test Runner

Standalone test-runner workspace for shared test infrastructure, fixtures, and CI portability checks.

## Workspace Layout

- `packages/*` - test runner packages
- `fixtures/*` - reusable test fixtures
- `ci/portability/` - portability checks and scripts

## Current Scope

`@haakco/test-sections-playwright` currently provides:

- config definition helper (`defineConfig`)
- section listing (`--list`)
- coverage validation (`--validate`)
- section execution with:
  - section filtering (`--section`)
  - bounded parallelism (`--parallel`)
  - Playwright shard forwarding (`--shard`)
  - serial section handling (`serial: true`)

For concrete usage examples, see:

- [`packages/test-sections-playwright/README.md`](./packages/test-sections-playwright/README.md)
- [`fixtures/consumer-simple`](./fixtures/consumer-simple)
- [`fixtures/consumer-multi-role`](./fixtures/consumer-multi-role)

## tl-web-gui Adoption

Use the dedicated migration guide:

- [`docs/tl-web-gui-migration.md`](./docs/tl-web-gui-migration.md)

This includes:

- script mapping from current `tl-web-gui` commands
- section config shape to use today
- shard strategy guidance
- duration-budget and role mapping guidance

## Rule: Keep This Repo Decoupled

Do not import code from consumer repositories.

This repo must stay standalone so it can be versioned, tested, and released independently.
