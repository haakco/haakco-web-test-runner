# Playwright Runner Release Contract Plan

**Goal:** Make the shared Playwright section runner's repository tag, package metadata, tests, portability gates, release
process, and consumer upgrade path one coherent versioned contract.

**Acceptance criteria:** `@haakco/test-sections-playwright` has an unambiguous released version and install reference;
repository tags and package metadata follow a documented rule; behavior-focused unit tests protect configuration,
validation, scheduling, serial sections, bounded parallelism, and Playwright shard forwarding; CI uses the workspace's
pinned toolchain and runs the same quality/portability commands as local development; a release artifact or Git tag is
verified from a clean consumer fixture; `cb` and `awthy` have exact upgrade handoffs; and no consumer-specific code is
imported into this repository.

## Current State (Verified 2026-07-17)

- The repository is a clean standalone workspace on `main`, five commits after repository tag `v1.2.0`.
- `packages/test-sections-playwright/package.json` declares package version `0.2.0`, while consumers and the central
  catalog treat repository tag `v1.2.0` as the maintained release.
- The root package is private at version `0.0.0` and exposes the Playwright package's built entrypoint and CLI.
- The root `test` script is a placeholder. `test:packages` only invokes package test scripts that exist, and the
  Playwright package currently defines build and typecheck scripts but no behavior test script.
- `ci/quality/run-quality-gates.sh` installs the frozen lockfile, builds packages, checks public exports, rejects known
  consumer imports, and runs Playwright and Laravel portability fixtures. It is currently stronger than the nominal
  package test command.
- The workspace pins `pnpm@10.30.3`, but `.github/workflows/portability-consumers.yml` installs pnpm `10.6.2` explicitly.
- `.changeset/config.json` and root `version`/`release` scripts exist, but the repository does not document whether the
  package version, repository tag, and downloadable artifact version must be identical.
- `tlm`, `lvm`, and MacNan consume Git tag `v1.2.0`; `cb` and `awthy` still consume the `v0.2.0` release tarball. Synced
  TrackLab destination repositories are consumers, not separate migration owners.
- The repository has no local `AGENTS.md` or plan index. This plan establishes the first canonical plan index without
  adding consumer implementation here.

## Plan-Affecting Findings

- A Git tag named `v1.2.0` with package metadata `0.2.0` is a real contract ambiguity, not a cosmetic mismatch. Consumers
  cannot reason about compatibility, upgrades, generated lockfiles, or future major aliases reliably.
- Portability fixtures prove installation shape and public API use, but they are not a substitute for focused unit tests
  of scheduling and CLI behavior.
- A release must be verified through the same install mechanism consumers use. Passing a workspace build alone does not
  prove a Git dependency or packaged tarball is complete.
- Consumer duration budgets and shard counts remain consumer-owned inputs. This package may validate and execute a
  declared schedule, but must not invent concurrency from file count or hard-code another project's thresholds.
- `haakco-test-contract` and the Laravel adapter are separate package surfaces. Do not present the incomplete Laravel
  scaffold as a replacement for `haakco/laravel-parallel-test-runner`.

## Dependencies and Conflict Boundaries

- This repository owns the runner implementation, package metadata, public API, CLI, fixtures, changesets, workflows,
  release documentation, and release artifact.
- `cb` and `awthy` own their dependency changes, lockfiles, section configuration, duration data, and CI matrices. Their
  migrations begin only after this plan publishes and verifies the chosen release contract.
- `TrackLab/tlm` is the only TrackLab implementation owner. Do not create separate migration work in `tl-web-gui`.
- Do not import consumer helpers, fixtures, duration files, or application code into `packages/`.
- Do not add automatic shard-count selection, a Laravel replacement, Docker image publication, or a hosted service in
  this plan.
- Do not publish a package, tag, or release from an unreviewed or dirty tree. Publishing remains an explicit terminal
  action after local and CI evidence is green.

## Owner Files

- `packages/test-sections-playwright/package.json`
- `packages/test-sections-playwright/src/` and focused tests beside or under the package's chosen test directory
- `packages/test-sections-playwright/CHANGELOG.md`
- root `package.json` and `pnpm-lock.yaml`
- `.changeset/`
- `ci/quality/run-quality-gates.sh`
- `ci/portability/check-public-api.sh`
- `ci/portability/check-no-consumer-imports.sh`
- `ci/portability/run-playwright-consumer.sh`
- Playwright fixtures under `fixtures/consumer-simple/` and `fixtures/consumer-multi-role/`
- `.github/workflows/library-quality.yml` and `.github/workflows/portability-consumers.yml`
- `README.md`, package README, release documentation, and this plan/index

## Milestones

### 1. Decide and document one version contract

- Ownership: manifests, changesets, changelogs, and release documentation.
- Dependencies: inspect existing tags, release artifacts, lockfiles, and current consumer install references.
- Implementation: choose one explicit relationship between repository tags and publishable package versions; align
  metadata and changelogs forward-only; document install syntax, compatibility, rollback, and whether a maintained major
  alias exists. Do not invent a Docker-style `:1` syntax for a Git dependency.
- Proof: a script or test rejects a release candidate whose tag, changeset, package version, and documented artifact
  disagree under the selected contract.
- Review: spec and code-quality review; dependency/release security review.

### 2. Add behavior-focused package tests

- Ownership: Playwright package source and tests.
- Dependencies: frozen public behavior from Milestone 1.
- Implementation: add the smallest high-signal tests for config definition, section listing, duplicate or missing
  coverage validation, filtering, serial ordering, bounded parallel execution, failure propagation, CLI argument
  handling, and shard forwarding. Consolidate overlapping cases rather than maximizing test count.
- Proof: demonstrate red/green behavior for each repaired or newly protected invariant; `pnpm test:packages` must execute
  real Playwright package tests and fail when a protected invariant is broken.
- Review: spec and code-quality review of behavior and test duplication.

### 3. Make local and CI quality gates identical

- Ownership: root/package scripts, quality script, and two workflows.
- Dependencies: Milestone 2 tests.
- Implementation: align pnpm with the root `packageManager`; use frozen installs; make the discoverable local command run
  build, typecheck, behavior tests, public export checks, forbidden-import checks, and consumer portability fixtures;
  remove any nominal green gate that skips real package tests.
- Proof: local quality command and both workflows invoke the same owned scripts; CI contains no divergent pnpm version or
  reduced package-test path.
- Review: workflow spec, quality, and dependency security review.

### 4. Prove the packed or tagged consumer contract

- Ownership: release candidate construction and isolated fixtures.
- Dependencies: Milestones 1-3 green.
- Implementation: build the exact artifact or Git reference consumers will install; install it into clean simple and
  multi-role fixtures without workspace linkage; run list, validate, and section execution; inspect the artifact for
  required `dist`, types, CLI shebang/permissions, README, and absence of source-only or consumer files.
- Proof: the release candidate passes both fixture shapes from a clean temporary install using the documented reference.
- Review: release contents and provenance review.

### 5. Publish once and hand off consumer migrations

- Ownership: reviewed release/tag and migration notes only.
- Dependencies: one green local candidate and green CI for the same commit.
- Implementation: publish/tag once; verify the remote artifact and immutable commit; provide exact dependency reference,
  lockfile expectation, rollback reference, and focused commands to `cb` and `awthy` owners.
- Proof: remote reference installs in the portability fixture; repository tag and package metadata satisfy Milestone 1.
- Review: no consumer repository edits in this milestone.

## Integration and Final Validation

Run focused package tests during implementation, then once after the tree stabilizes:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm run build:packages
pnpm run test:packages
./ci/quality/run-quality-gates.sh
git diff --check
```

The final release-candidate proof must additionally install the exact packed or tagged artifact into clean portability
fixtures. Record commands, resolved version/commit, artifact contents, and results in this plan. Do not publish merely to
discover whether the candidate works.

## Terminal Checklist

- [ ] Repository tag/package/artifact version rule documented and mechanically checked.
- [ ] Playwright package metadata, changeset, and changelog agree.
- [ ] `pnpm test:packages` runs real behavior tests rather than a placeholder or empty package set.
- [ ] Local and CI commands share one frozen, pinned toolchain path.
- [ ] Public API, forbidden-import, simple-consumer, multi-role, and Laravel scaffold portability gates pass.
- [ ] Exact release candidate installs and runs outside the workspace.
- [ ] One reviewed release/tag published and verified against its immutable commit.
- [ ] `cb` and `awthy` receive exact upgrade and rollback handoffs; TrackLab ownership remains in `tlm`.
- [ ] No consumer code, duration policy, automatic shard growth, or Laravel replacement entered the package.
- [ ] Plan index updated and completed plan archived according to the repository's adopted plan convention.

## Risks and Deferred Work

- Aligning metadata may require a forward version rather than rewriting an already-published tag or artifact. Preserve
  published history and document the correction.
- npm/Verdaccio publication and maintained major aliases require an explicit release-channel decision. A verified Git
  tag remains acceptable until that decision is implemented and documented.
- Consumer-specific duration balancing, coverage consolidation, and CI matrix changes remain in consumer plans.
- A general cross-language test contract or production-ready Laravel adapter requires separate evidence and plans.
