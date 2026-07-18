# Release Contract Audit Fixes Implementation Plan

**Goal:** Make the completed v1.3.0 release state safe for the next release by removing its consumed changeset and using
Semantic Versioning order in the release contract gate.
**Acceptance criteria:** no v1.3.0 changeset remains pending; the gate correctly distinguishes equal, newer, and older
versions including multi-digit components; focused regression tests and the full quality path pass; independent quality
and security review finds no blocking issue; and this plan is archived with evidence.

## Current State (Verified)

- `.changeset/release-contract-1.3.0.md` remains after `v1.3.0` was tagged, so the next `pnpm version` would consume it
  again.
- `ci/release/check-version-contract.sh` uses Bash lexicographic `<` and `>` comparisons for versions.
- On untagged `main` at version `1.3.0`, the gate reports a misleading pending release from `v1.3.0` to `1.3.0`.
- The immutable `v1.3.0` tag remains at `503e81f` and will not be rewritten.

## Plan-Affecting Findings

- The two review findings are required work because they make the documented next-release path unsafe.
- Correcting equal-version reporting is required work at the same comparison owner and prevents stale changeset evidence
  from being accepted as a pending release.
- A focused shell regression test is a plan accelerator and low-cost prevention mechanism for the release gate.

## Milestones

### 1. Protect the release-state contract with focused failing tests

- Ownership: `ci/release/`.
- Dependencies: existing Git tag/package/CHANGELOG/changeset contract.
- Proof: the test reproduces equal untagged state, `1.10.0 > 1.9.0`, older-version rejection, and unconsumed-changeset
  rejection.
- Implementation: exercise the real gate in isolated temporary Git repositories.
- Review: spec and test-quality review.

### 2. Fix the owning release gate and consumed state

- Ownership: `ci/release/check-version-contract.sh`, `.changeset/`, release documentation, and quality wiring.
- Dependencies: Milestone 1.
- Proof: focused tests pass and no package-referencing changeset remains after versioning.
- Implementation: compare validated SemVer values numerically without a new dependency, remove the consumed changeset,
  report equal untagged state accurately, and run the regression test in existing local/CI gates.
- Review: spec, code-quality, and release-pipeline security review.

### 3. Complete validation and closeout

- Ownership: plan evidence and plan index.
- Dependencies: stable implementation and independent review.
- Proof: `pnpm lint`, focused tests, a direct consumed-changeset check, `./ci/quality/run-quality-gates.sh`, and
  `git diff --check` pass; review findings are resolved.
- Implementation: record evidence, complete the terminal checklist, and archive this plan.
- Review: final diff and plan-completeness review.

## Integration and Final Validation

- Test readiness: local Node, pnpm, Git, Bash, package fixtures, and frozen lockfile are present; temporary repositories
  contain synthetic versions only and require no credentials or network writes.
- Acceptance run: `./ci/release/test-version-contract.sh`; direct package changeset search; `pnpm lint`;
  `./ci/quality/run-quality-gates.sh`; `git diff --check`.
- Shared validation: this plan owns the audit-fix validation and links back to the archived v1.3.0 release-contract plan.
- Quality and security gates: independent review of release correctness, shell safety, temporary-file cleanup, and CI
  wiring after the full local gate passes.

## Terminal Checklist

- [x] Consumed v1.3.0 changeset removed.
- [x] Semantic Versioning comparison and equal-version state covered by regression tests.
- [x] Existing local and CI quality paths run the focused release-contract tests.
- [x] Full local validation passes.
- [x] Independent quality and security review passes with all blocking findings resolved.
- [x] Evidence recorded, index updated, and plan archived.

## Execution Evidence (Closeout 2026-07-18)

- Removed `.changeset/release-contract-1.3.0.md`; direct inspection confirms no changeset references the package after
  `pnpm run version` consumed the `v1.3.1` patch changeset. (`pnpm changeset status` intentionally reports that package
  metadata changed without a pending changeset after versioning, so it is not the release-candidate proof.)
- Replaced Bash lexicographic ordering with a SemVer 2.0 comparator using numeric `BigInt` core and prerelease
  precedence. Tag selection now uses the same comparator rather than Git's non-SemVer version sort.
- Added `ci/release/test-version-contract.sh`, which exercises the real gate in isolated temporary Git repositories and
  covers equal post-release state, `1.10.0 > 1.9.0`, older-version rejection, unconsumed changeset rejection, invalid
  leading-zero prerelease identifiers, and stable `v1.0.0` sorting after `v1.0.0-rc.1`.
- Wired the focused regression test into `ci/quality/run-quality-gates.sh` and `.github/workflows/library-quality.yml`;
  updated `RELEASE.md` to require consumed changesets before tagging.
- Red/green evidence: the focused test first failed on the misleading equal-version pending-release result, then passed
  after the owning comparison and reporting fix.
- Final validation passed: `shellcheck ci/release/check-version-contract.sh ci/release/test-version-contract.sh`;
  `./ci/release/test-version-contract.sh`; `./ci/release/check-version-contract.sh`; direct package changeset search;
  `pnpm lint`; `./ci/quality/run-quality-gates.sh`; and `git diff --check`. The full quality run included frozen install,
  build, 60/60 behavior tests, public API and forbidden-import checks, both Playwright consumer fixtures, and the Laravel
  fixture.
- Independent quality/security review initially found Git's prerelease tag-sort mismatch. After the SemVer tag-selection
  fix and exact regression case, re-review passed with no blocking findings. No shell, temporary Git repository, or CI
  security issue remained.
- Release rehearsal for `v1.3.1` found and fixed a phase mismatch: versioned candidates now require their release
  changesets to be consumed, matching the documented `pnpm run version` flow.

## Risks and Deferred Work

- The published `v1.3.0` tag is immutable and remains unchanged. These forward-only fixes protect subsequent releases.
