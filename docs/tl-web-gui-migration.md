# tl-web-gui Migration Guide

## Goal

Replace local section orchestration scripts in `tl-web-gui` with `@haakco/test-sections-playwright` while preserving command UX.

## What To Migrate First

1. Add dependency:
```bash
pnpm add -D @haakco/test-sections-playwright
```
2. Add `e2e-sections.config.ts` at repo root.
3. Update `package.json` scripts to call `haakco-test-sections`.
4. Keep existing local scripts as thin wrappers during transition (one release window).

## Recommended Config Shape (Current CLI)

```ts
import { defineConfig } from '@haakco/test-sections-playwright';

export default defineConfig({
  defaults: {
    configPath: './playwright.config.ts',
    parallel: 4,
  },
  sections: [
    {
      id: 'company-auth-core',
      testFiles: [
        'tests/e2e/sign-in.spec.ts',
        'tests/e2e/register.spec.ts',
      ],
    },
    {
      id: 'sa-core-resources',
      testFiles: [
        'tests/e2e/sa-companies.spec.ts',
        'tests/e2e/sa-users.spec.ts',
      ],
      serial: true,
    },
  ],
});
```

## Script Mapping

Use this mapping to preserve current command names:

- `test:e2e:sections:validate` -> `haakco-test-sections --validate --config ./e2e-sections.config.ts`
- `test:e2e:sections:list` -> `haakco-test-sections --list --config ./e2e-sections.config.ts`
- `test:e2e:sections` -> `haakco-test-sections run --config ./e2e-sections.config.ts --parallel 4`
- shard run -> `haakco-test-sections run --config ./e2e-sections.config.ts --parallel 2 --shard 1/3`

## Sharding Behavior

Current runtime supports Playwright-native shard forwarding only:

- Supported: `--shard x/y` passed to `playwright test`
- Not currently built-in: modulo-by-index custom scheduler

If `tl-web-gui` still needs modulo behavior, keep a small wrapper script that converts desired partitioning to section subsets before invoking `haakco-test-sections`.

## Roles and Auth

Current CLI does not enforce role semantics directly.

Recommended approach now:

- keep role-to-storage-state mapping in consumer-owned config
- enforce role handling in `playwright.config.ts` and `global-setup.ts`
- optionally keep `metadata.role` on sections for reporting and wrapper logic

## Duration Budgets

Current CLI does not enforce duration thresholds by itself.

Recommended approach now:

- keep a dedicated `validate:durations` script in `tl-web-gui`
- run it in CI alongside:
  - `haakco-test-sections --validate ...`
  - section run/shard jobs

## CI Rollout Sequence

1. Add `--validate` as required check.
2. Add one shard job (`--shard 1/2`).
3. Expand to matrix shards (`1/2`, `2/2`).
4. Make shard jobs merge-blocking after stable green runs.

## Validation Checklist

- `haakco-test-sections --list --config ./e2e-sections.config.ts`
- `haakco-test-sections --validate --config ./e2e-sections.config.ts`
- `haakco-test-sections run --config ./e2e-sections.config.ts --parallel 2`
- `haakco-test-sections run --config ./e2e-sections.config.ts --parallel 2 --shard 1/3`
- consumer-specific `validate:durations` still passes

