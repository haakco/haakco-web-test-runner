# Shared Web Test Runner Plan Index

Last verified: 2026-07-17

This is the canonical index for intended work in this repository. Keep implementation plans directly under
`docs/plans/`. Move completed plans to `archive/docs/plans/` with their evidence and remove them from the active table in
the same change.

## Active Plans

| Plan | Status | Next gate |
| --- | --- | --- |
| [Playwright Runner Release Contract Plan](2026-07-17_playwright_runner_release_contract_plan.md) | Planned | Decide and test one tag/package/artifact version contract before consumer migrations. |

## Consumer Coordination

- `TrackLab/tlm` is the canonical TrackLab implementation owner; synced destination repositories do not receive
  duplicate migration plans.
- `cb` and `awthy` remain on their current dependency references until the release-contract plan publishes and verifies
  an exact upgrade target.
- Consumer duration budgets, coverage consolidation, worker counts, and shard counts remain in consumer-owned plans.
