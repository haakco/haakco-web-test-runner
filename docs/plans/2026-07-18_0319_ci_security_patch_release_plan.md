# CI and Security Patch Release Plan

**Goal:** Restore all repository CI to green, close every open Dependabot alert, and publish an annotated production patch tag.
**Acceptance criteria:** Node 20 consumer fixtures load TypeScript configs; the lockfile contains no vulnerable `js-yaml` versions; local quality and security gates pass; all Actions for the release commit succeed; no open Dependabot alerts remain; the annotated tag resolves to the release commit.

## Current State (Verified)

- `.github/workflows/portability-consumers.yml` tests the public consumer path on Node 20 and fails while importing `fixtures/consumer-simple/e2e-sections.config.ts`.
- `packages/test-sections-playwright/src/cli.ts` imports `.ts` config files directly without registering a TypeScript loader; Node 24 masks this locally through native type stripping.
- `pnpm-lock.yaml` resolves `js-yaml` 3.14.2 through Changesets and 4.1.1 through `@changesets/parse`; Dependabot alerts 4 and 5 require 3.15.0 and 4.2.0 respectively.
- `main` and `origin/main` are clean at `ee7dc40`, tagged `v1.3.1`; Library Quality passes and Portability Consumers fails.

## Plan-Affecting Findings

- Required work: make the CLI's documented Node 20 runtime own TypeScript config loading rather than relying on Node 24 behavior.
- Required work: constrain all `js-yaml` resolutions to patched 4.2.0 and verify the legacy Changesets caller remains compatible.
- Required work: create a new patch version and tag because the user requested a production build tag after behavior and dependency changes.
- Required work: the first release-candidate CI run reached browser execution and proved the ephemeral ARC runner has no matching Chromium binary. The shared quality gate must provision the pinned fixture browser before consumer execution; this is required for the existing acceptance path, not a new test expansion.

## Milestones

### 1. Reproduce and protect the Node 20 consumer boundary

- Ownership: `packages/test-sections-playwright`, consumer portability fixture and scripts.
- Dependencies: existing `tsx` runtime capability.
- Proof: the fixture fails before the fix and passes under an actual Node 20 runtime after it.
- Implementation: register the maintained TypeScript loader from the CLI and make it a runtime dependency.
- Review: spec and quality review; security review covers config-path loading and runtime dependency execution.

### 2. Remediate dependency alerts

- Ownership: workspace manifest and `pnpm-lock.yaml`.
- Dependencies: patched `js-yaml@4.2.0` compatibility with Changesets.
- Proof: `pnpm why js-yaml`, lockfile inspection, `pnpm audit`, Changesets/version-contract regression tests, and frozen install.
- Implementation: apply one workspace-wide pnpm override and refresh the lockfile.
- Review: security and build-pipeline review required.

### 3. Release and remote confirmation

- Ownership: changeset, changelog, package version, plan/index, Git commit, annotated tag, GitHub Actions.
- Dependencies: stable local tree and all local gates passing.
- Proof: exact remote branch/tag SHAs, successful Actions conclusions, and zero open Dependabot alerts.
- Implementation: consume a patch changeset, archive this completed plan, commit/push once, then create and push the annotated production tag.
- Review: final diff, release-contract, quality, and security review.

## Integration and Final Validation

- Test readiness: macOS workspace plus mise-provisioned Node 20; GitHub ARC self-hosted runners provide the target Linux/Node 20 environment; fixtures contain no external credentials or production data.
- Acceptance run: `mise x node@20 -- ./ci/quality/run-quality-gates.sh`, `pnpm audit`, `git diff --check`, release-contract tests, then GitHub Actions for the pushed release commit. Success requires zero command failures, both repository workflows green, and zero open alerts.
- Shared validation: this plan owns the single final quality run.
- Quality and security gates: Biome, TypeScript, package build/tests, public API and forbidden-import checks, consumer fixtures, version contract, frozen install, audit, and independent review of runtime/dependency/workflow boundaries.

## Terminal Checklist

- [x] Node 20 consumer failure reproduced and regression protected.
- [x] TypeScript config loading works through the package CLI on Node 20.
- [ ] All open Dependabot alerts are remediated locally and remotely.
- [x] Full local CI-equivalent and security validation passes.
- [ ] Plan evidence is complete, plan is archived, and index links are updated.
- [ ] Patch version is committed and pushed to `main`.
- [ ] Annotated production tag is pushed and resolves to the release commit.
- [ ] All release-commit GitHub Actions are green.

## Risks and Deferred Work

- None.

## Execution Evidence

- Red proof: `mise x node@20 -- ... pnpm run verify:sections` failed with `Unknown file extension ".ts"` before the loader registration.
- Green proof: the same Node 20 fixture command passed after `tsx/esm` became a runtime-owned loader.
- Full acceptance: `mise x node@20 -- ./ci/quality/run-quality-gates.sh` passed, including 60/60 package tests, both Playwright fixtures, and the Laravel fixture.
- Dependency proof: `pnpm why` resolves only `js-yaml@4.2.0` and `read-yaml-file@2.1.0`; `pnpm audit --audit-level=low` reports no known vulnerabilities.
- Toolchain proof: `pnpm install --frozen-lockfile`, `pnpm run lint`, release-contract regression tests, and `git diff --check` passed.
- Independent review: spec, code-quality, build-pipeline, and security review found no concrete blockers. The review confirmed actual Node 20 consumer execution and Changesets compatibility.
- Release sequencing: the `1.3.2` changeset is consumed. The version contract will be rerun after the release candidate commit so HEAD is no longer the already-tagged `v1.3.1` commit.
- Remote candidate evidence: Library Quality run `29625199309` passed and both Dependabot alerts closed. Portability run `29625199282` passed TypeScript config loading, then failed because the ephemeral runner lacked Playwright Chromium build `1208`; the quality owner now installs the pinned Chromium before running consumers.
- CI cost: the installer is delayed until immediately before browser consumers and uses Playwright's `--only-shell` mode, avoiding downloads on earlier gate failures and omitting the unused full browser binary.
