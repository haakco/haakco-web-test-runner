# consumer-multi-role fixture

Minimal Playwright fixture for validating multi-role consumer usage with section-based selection.

## Scripts

- `npm run verify:sections` - runs shared CLI config validation (`haakco-test-sections --validate`).
- `npm run validate:durations` - validates section duration baseline against `durationValidation.maxAllowedDeltaMs`.
- `npm run list:sections` - runs shared CLI list mode (`haakco-test-sections --list`).
- `npm run run:e2e` - runs Playwright tests with this fixture config.
- `npm run run:sections` - runs shared CLI with parallel override and optional shard.

## run:sections options

- `SECTIONS_PARALLEL` - overrides `--parallel` (default: `2`)
- `SECTIONS_SHARD` - optional shard value (for example `1/3`)
