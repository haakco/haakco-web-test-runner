# Consumer Upgrade Reference for `@haakco/test-sections-playwright` v1.3.0

This document is the exact upgrade target for consumer repositories that pin
`@haakco/test-sections-playwright` by Git reference or tarball. It is published
from the source repository at `/Volumes/Dev/HaakCo/AiProjects/sharedLib/web/haakco-web-test-runner`.

## Release summary

- Source repository: `haakco/haakco-web-test-runner`
- Released Git tag: `v1.3.0` (forward-only correction of historical `0.2.0` vs `v1.2.0` mismatch).
- Released artifact: `pnpm pack` tarball with the same `1.3.0` version, published from the same commit.
- Verified install shape: clean temporary fixture installs the tarball without workspace linkage,
  runs `--list`, `--validate`, and a full section execution end-to-end.

## Consumer install reference (cb, awthy, tlm, lvm, MacNan)

Git dependency, pinned to the released tag:

```json
{
  "devDependencies": {
    "@haakco/test-sections-playwright": "github:haakco/haakco-web-test-runner#v1.3.0"
  }
}
```

Then run `pnpm install --frozen-lockfile` to materialize the lockfile entry.

If the consumer does not yet use the Git reference form, the exact pin to copy from the
previous `v0.2.0` tarball release is:

```json
{
  "devDependencies": {
    "@haakco/test-sections-playwright": "https://github.com/haakco/haakco-web-test-runner/archive/refs/tags/v1.3.0.tar.gz"
  }
}
```

## Lockfile expectation

The lockfile entry for the new install will resolve to:

- `resolution: { tarball: 'https://github.com/haakco/haakco-web-test-runner/archive/refs/tags/v1.3.0.tar.gz' }`
- or the equivalent GitHub `git+ssh`/`git+https` URL with `refs/tags/v1.3.0`.

`pnpm install --frozen-lockfile` must succeed after the upgrade commit is added.

## Behavior changes from v0.2.0 / v1.2.0 to v1.3.0

- The package `version` field now matches the Git tag. There is no longer a
  `0.2.0` / `v1.2.0` mismatch. Consumers reading `pkg.version` from
  `@haakco/test-sections-playwright/package.json` will see `1.3.0`.
- A mechanical version-contract check (`ci/release/check-version-contract.sh`) is
  now enforced in CI. Future releases that violate the contract fail the gate.
- The CLI now validates `--shard` and `--grep` inputs at parse time and throws a
  clear error rather than producing an opaque Playwright downstream error.
- Two latent bugs fixed:
  - `parsePositiveInteger('1.5')` previously returned `1` (silent parseInt truncation).
    It now correctly throws "must be a positive integer".
  - Glob `**/foo.spec.ts` previously required at least one directory segment
    between `**/` and `foo`. It now matches the standard glob interpretation
    (zero or more path segments).
- 60 behavior tests run under `pnpm test:packages` (60/60 passing locally).

## Rollback reference

Roll back to the prior version is a single-line revert in the consumer repo:

```diff
- "@haakco/test-sections-playwright": "github:haakco/haakco-web-test-runner#v1.3.0"
+ "@haakco/test-sections-playwright": "github:haakco/haakco-web-test-runner#v1.2.0"
```

Then `pnpm install --frozen-lockfile`. The previous `v1.2.0` tag is preserved
and immutable on the source repository.

For consumers still on the old `v0.2.0` release tarball, the equivalent rollback
target is `v0.2.0` (or `v1.2.0` if they want the intermediate stable tag).

## Coordinated per-consumer actions

| Consumer | Current pin | Target pin | Owner notes |
| --- | --- | --- | --- |
| `TrackLab/tlm` | `github:haakco/haakco-web-test-runner#v1.2.0` | `github:haakco/haakco-web-test-runner#v1.3.0` | `tlm` owns the TrackLab migration plan; section config, role metadata, and shard strategy stay in `tlm`. |
| `cb` (cb/web-gui) | `v0.2.0` tarball | `github:haakco/haakco-web-test-runner#v1.3.0` | `cb` owns its own section configuration, duration budgets, and CI matrix. The upgrade commit and lockfile change are a one-line diff; the rest of `cb` is unchanged. |
| `awthy` | `v0.2.0` tarball | `github:haakco/haakco-web-test-runner#v1.3.0` | Same shape as `cb`. No code changes required in `awthy` unless consumer-specific CI matrices or section durations are also being updated in the same release. |

The source repository here does not touch any of `tlm`, `cb`, or `awthy`. Their
upgrades are independent PRs in those consumer repositories.

## Out of scope for this release

- No automatic shard-count selection (the package only forwards the value the
  consumer provides).
- No Laravel replacement. The `test-sections-laravel` package in this
  repository remains an incomplete scaffold and is NOT a replacement for
  `haakco/laravel-parallel-test-runner`.
- No Docker image publication.
- No maintained alias (e.g. `:1` Docker-style). Consumers use the exact tag.

## Validation commands consumers should run

After upgrading, run the same owned commands the source repository uses:

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium    # if not already installed
pnpm run verify:sections                 # or equivalent per-consumer validate script
pnpm run test:sections                   # or equivalent per-consumer run script
```

If any of these fail after the upgrade, the consumer has either a section config
that violates the new `--shard` or `--grep` validation, or a section that no
longer matches any discovered spec file. Both failures now report the exact
section id and reason at parse time.

## Source-side verification record

- HEAD commit: see `git log -1` on the source repository after `v1.3.0` is tagged.
- `pnpm test:packages`: 60 / 60 passing.
- `./ci/quality/run-quality-gates.sh`: green end-to-end (install → lint → build →
  behavior tests → public API → forbidden imports → version contract → Playwright
  consumer (3 sections) → Laravel consumer (2 sections)).
- `./ci/release/check-version-contract.sh`: passes with HEAD tagged `v1.3.0`.
- Clean `/tmp/clean-fixture` install: tarball installs without workspace link,
  `haakco-test-sections --list`, `--validate`, and one full section run all pass.

Last verified: 2026-07-18.
