# HaakCo Test Runner

Standalone test-runner workspace for shared test infrastructure, fixtures, and CI portability checks.

## Workspace Layout

- `packages/*` - test runner packages
- `fixtures/*` - reusable test fixtures
- `ci/portability/` - portability checks and scripts

## Rule: Keep This Repo Decoupled

Do not import code from consumer repositories.

This repo must stay standalone so it can be versioned, tested, and released independently.
