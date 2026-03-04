# Portability Results

Date: YYYY-MM-DD
Commit/Change: <fill-in>
Runner: <local|ci>

## Summary

- Status: <PASS|FAIL>
- Notes: <short summary>

## Checks

| Check | Command | Status | Notes |
| --- | --- | --- | --- |
| Public API exports | `ci/portability/check-public-api.sh` | <PASS|FAIL> | <notes> |
| No consumer imports | `ci/portability/check-no-consumer-imports.sh` | <PASS|FAIL> | <notes> |
| Playwright consumers | `ci/portability/run-playwright-consumer.sh` | <PASS|FAIL> | <notes> |
| Laravel consumer | `ci/portability/run-laravel-consumer.sh` | <PASS|FAIL|SKIPPED> | <notes> |
| Quality gates | `ci/quality/run-quality-gates.sh` | <PASS|FAIL> | <notes> |

## Output Snippets

### Public API exports

```text
<paste output>
```

### No consumer imports

```text
<paste output>
```

### Playwright consumers

```text
<paste output>
```

### Laravel consumer

```text
<paste output>
```

### Quality gates

```text
<paste output>
```
