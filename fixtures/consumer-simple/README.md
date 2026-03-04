# consumer-simple

Minimal Playwright fixture consumer for `@haakco/test-sections-playwright`.

## Scripts

- `pnpm run verify:sections` validates section config through `haakco-test-sections`.
- `pnpm run test:sections` runs sections via `haakco-test-sections run --parallel 2`.
- `pnpm run test:sections:list` lists configured sections via `haakco-test-sections`.

## Files

- `e2e-sections.config.ts` contains section definitions (`smoke`, `feature-a`, `feature-b`).
- `playwright.config.ts` points to the fixture's local `tests/e2e` directory.
- `tests/e2e/*.spec.ts` includes lightweight data URL tests.
- `scripts/verify-sections.mjs` is a thin compatibility wrapper around `haakco-test-sections --validate`.
