# @haakco/test-sections-playwright

## 1.3.0

### Minor Changes

- Establishes a forward-only release contract: the repository tag must equal
  `packages/test-sections-playwright/package.json#version` and the CHANGELOG
  top entry. `ci/release/check-version-contract.sh` enforces this in CI.
- Adds behavior-focused unit tests covering config definition, CLI argument
  parsing, section filtering, coverage validation, glob matching, bounded
  parallel execution, serial ordering, failure propagation, and shard
  forwarding. `pnpm test:packages` now exercises real tests instead of a
  placeholder.
- Aligns the local quality command and both CI workflows on the same frozen
  toolchain path (`pnpm@10.30.3`), so local and CI gate selection match.

## 0.2.0

### Minor Changes

- Initial publish-ready release for shared test-sections contract and Playwright runner CLI.

  - Adds config-driven section listing, validation, and execution.
  - Adds portability-validated fixture consumers.
  - Establishes stable package boundaries for external adoption.
