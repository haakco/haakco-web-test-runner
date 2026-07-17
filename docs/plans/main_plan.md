# Shared Web Test Runner Plan Index

Last verified: 2026-07-18

This is the canonical index for intended work in this repository. Keep implementation plans directly under
`docs/plans/`. Move completed plans to `archive/docs/plans/` with their evidence and remove them from the active table in
the same change.

## Active Plans

| Plan | Status | Next gate |
| --- | --- | --- |
| [Playwright Runner Release Contract Plan](2026-07-17_playwright_runner_release_contract_plan.md) | In Progress — M1-M4 complete on local commits, awaiting publish + handoff (M5) | Publish the `v1.3.0` tag once the user explicitly approves, then hand the upgrade reference to `cb` and `awthy`. |

## Completed Milestones (this plan, not yet published)

- M1 Version contract: `RELEASE.md`, `ci/release/check-version-contract.sh`, package metadata aligned to `1.3.0`
  (forward correction of historical `0.2.0` vs `v1.2.0` mismatch). Wired into `ci/quality/run-quality-gates.sh`.
- M2 Behavior tests: 60 node:test cases in `packages/test-sections-playwright/src/runner.test.ts` covering arg
  parsing, glob matching, coverage validation, section filtering, bounded parallelism, failure propagation, and
  shard/grep forwarding. Pure helpers extracted to `src/runner.ts`. Two latent bugs fixed
  (`parsePositiveInteger` decimal truncation; glob `**/` zero-or-more segments).
- M3 CI/local alignment: both workflows now use the workspace `packageManager` (pnpm@10.30.3), frozen-lockfile
  installs, and the same owned scripts as the local quality gate. `library-quality.yml` no longer runs a divergent
  build-only path.
- M4 Artifact verification: `pnpm pack` produces a clean tarball at the resolved `1.3.0` version; a from-scratch
  fixture at `/tmp/clean-fixture` (no workspace link) installs the tarball, runs `--list`, `--validate`, and a
  full section execution end-to-end against Playwright.

## Consumer Coordination

- `TrackLab/tlm` is the canonical TrackLab implementation owner; synced destination repositories do not receive
  duplicate migration plans.
- `cb` and `awthy` remain on their current dependency references until the release-contract plan publishes and
  verifies an exact upgrade target. The handoff document will pin the `v1.3.0` reference and the rollback path.
- Consumer duration budgets, coverage consolidation, worker counts, and shard counts remain in consumer-owned plans.
