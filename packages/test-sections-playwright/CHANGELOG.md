# @haakco/test-sections-playwright

## 1.3.2

### Patch Changes

- Load TypeScript section and Playwright configuration on every supported Node.js version, and resolve vulnerable transitive `js-yaml` versions to the patched release.

## 1.3.1

### Patch Changes

- Make the next-release contract safe by consuming completed changesets, comparing
  versions with Semantic Versioning precedence, and regression-testing release tag
  selection in local and CI quality gates.

## 1.3.0

### Minor Changes

- Establishes a forward-only release contract: the repository tag must equal
  `packages/test-sections-playwright/package.json#version` and the CHANGELOG
  top entry. `ci/release/check-version-contract.sh` enforces this in CI.
- Adds behavior-focused unit tests covering config definition, CLI argument
  parsing, section filtering, coverage validation, glob matching, bounded
  parallel execution, serial ordering, failure propagation, and shard
  forwarding. `pnpm test:packages` now exercises real tests instead of a
  placeholder. The package uses `tsx` + `node:test` for fast TypeScript
  unit tests on Node 20.
- Aligns the local quality command and both CI workflows on the same frozen
  toolchain path (`pnpm@10.30.3`), so local and CI gate selection match.
- Fixes two latent bugs surfaced by the new tests: `parsePositiveInteger`
  silently truncated decimal input (e.g. `'1.5'` previously returned `1`);
  the glob matcher required at least one directory between `**/` segments.

## 0.2.0

### Minor Changes

- Initial publish-ready release for shared test-sections contract and Playwright runner CLI.

  - Adds config-driven section listing, validation, and execution.
  - Adds portability-validated fixture consumers.
  - Establishes stable package boundaries for external adoption.
