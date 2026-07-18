# Shared Web Test Runner Plan Index

Last verified: 2026-07-18

This is the canonical index for intended work in this repository. Keep implementation plans directly under
`docs/plans/`. Move completed plans to `archive/docs/plans/` with their evidence and remove them from the active table in
the same change.

## Active Plans

| Plan | Status | Next gate |
| --- | --- | --- |
| [CI and Security Patch Release](2026-07-18_0319_ci_security_patch_release_plan.md) | In progress | Reproduce Node 20 config-loading failure and remediate dependency alerts |

## Recently Completed

| Plan | Released tag | Archive |
| --- | --- | --- |
| [Release Contract Audit Fixes](../../archive/docs/plans/2026-07-18_0301_2026-07-18_0256_release_contract_audit_fixes_plan.md) | `v1.3.1` | [archive link](../../archive/docs/plans/2026-07-18_0301_2026-07-18_0256_release_contract_audit_fixes_plan.md) |
| [Playwright Runner Release Contract Plan](../../archive/docs/plans/2026-07-18_0144_2026-07-17_playwright_runner_release_contract_plan.md) | `v1.3.0` (commit `503e81f`) | [archive link](../../archive/docs/plans/2026-07-18_0144_2026-07-17_playwright_runner_release_contract_plan.md) |

## Consumer Coordination

- `TrackLab/tlm` is the canonical TrackLab implementation owner; synced destination repositories do not receive
  duplicate migration plans.
- `cb` and `awthy` upgrade to `v1.3.0` via the reference pinned in
  [`docs/consumer-upgrade-v1.3.0.md`](../consumer-upgrade-v1.3.0.md). Rollback to `v1.2.0` is one-line.
- Consumer duration budgets, coverage consolidation, worker counts, and shard counts remain in consumer-owned plans.
