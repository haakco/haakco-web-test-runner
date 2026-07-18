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

- [x] Repository tag/package/artifact version rule documented and mechanically checked.
- [x] Playwright package metadata, changeset, and changelog agree.
- [x] `pnpm test:packages` runs real behavior tests rather than a placeholder or empty package set.
- [x] Local and CI commands share one frozen, pinned toolchain path.
- [x] Public API, forbidden-import, simple-consumer, multi-role, and Laravel scaffold portability gates pass.
- [x] Exact release candidate installs and runs outside the workspace.
- [x] One reviewed release/tag published and verified against its immutable commit.
- [x] `cb` and `awthy` receive exact upgrade and rollback handoffs; TrackLab ownership remains in `tlm`.
- [x] No consumer code, duration policy, automatic shard growth, or Laravel replacement entered the package.
- [x] Plan index updated and completed plan archived according to the repository's adopted plan convention.

## Execution Evidence (Closeout 2026-07-18)

- Milestone 1 (version contract): `RELEASE.md` documents tag/package/changeset rule;
  `ci/release/check-version-contract.sh` enforces it; `packages/test-sections-playwright/package.json#version` set to
  `1.3.0`; `CHANGELOG.md` 1.3.0 entry added; `.changeset/release-contract-1.3.0.md` added; `biome.json` schema bumped
  2.4.15 → 2.4.16. Mechanical check passes locally.
- Milestone 2 (behavior tests): pure helpers extracted in `packages/test-sections-playwright/src/runner.ts`; 60 node:test
  cases in `src/runner.test.ts` cover config definition, duplicate/missing coverage, filtering, serial ordering, bounded
  parallelism, failure propagation, CLI parsing, `--shard`/`--grep` validation, and command construction. All pass via
  `pnpm test:packages`. `tsx` added as dev dependency for the node:test loader; build excludes `src/**/*.test.ts`.
- Milestone 3 (CI/local alignment): `pnpm install --frozen-lockfile` enforced in workflows and locally; pnpm `10.6.2` pin
  removed from `portability-consumers.yml`; `library-quality.yml` runs the full quality gate set; root `package.json`
  scripts replaced placeholder `test` with `pnpm run test:packages` and added `quality` alias; `run-quality-gates.sh`
  installs → lint → builds → tests packages → checks public API → checks forbidden imports → verifies version contract
  → runs Playwright and Laravel consumer fixtures.
- Milestone 4 (artifact verification): `pnpm pack` produces `/tmp/haakco-test-sections-playwright-1.3.0.tgz` with
  version `1.3.0`, expected `dist/`, `README.md`, and preserved CLI shebang. Clean `/tmp/clean-fixture` end-to-end install
  via documented reference succeeds for `--list`, `--validate`, and a full section run.
- Milestone 5 (publish + handoff): annotated tag `v1.3.0` created at commit `503e81f` and pushed to
  `origin`. `docs/consumer-upgrade-v1.3.0.md` records the install reference
  (`github:haakco/haakco-web-test-runner#v1.3.0`), lockfile expectation, one-line rollback to `v1.2.0`, and per-consumer
  coordination for `cb`, `awthy`, and `TrackLab/tlm`.
- Audits: plan completeness (this file's terminal checklist, evidenced above), security (one actionable finding —
  `esbuild` postinstall approval moved from `package.json#pnpm` to `pnpm-workspace.yaml` so pnpm 10.30.3 actually
  enforces it, fixed at c59fe77), and code excellence (no `.skills/haakco-code-excellence/` directory present in
  workspace — N/A). No database changes (no `.sql`, migrations, or schema files) — N/A for the database-table-patterns
  audit.
- Commits since `v1.2.0`: `000ba1b` (release contract docs), `4402cdd` (behavior tests + refactor),
  `669936a` (CI/local alignment), `f04c371` (review fixes), `503e81f` (canonical repo name), `c39658c` (archive),
  `c59fe77` (esbuild postinstall fix).
- Verification commands retained: `pnpm test:packages` (60/60 pass), `./ci/release/check-version-contract.sh` (pass),
  `./ci/quality/run-quality-gates.sh` (full green at c59fe77), remote tag verification via
  `git ls-remote --tags origin v1.3.0`.

## Risks and Deferred Work

- Aligning metadata may require a forward version rather than rewriting an already-published tag or artifact. Preserve
  published history and document the correction.
- npm/Verdaccio publication and maintained major aliases require an explicit release-channel decision. A verified Git
  tag remains acceptable until that decision is implemented and documented.
- Consumer-specific duration balancing, coverage consolidation, and CI matrix changes remain in consumer plans.
- A general cross-language test contract or production-ready Laravel adapter requires separate evidence and plans.
