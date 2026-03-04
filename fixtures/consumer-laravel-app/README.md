# consumer-laravel-app fixture

Minimal Laravel-style fixture that proves CLI/package portability for `haakco/test-sections-laravel` without requiring a full Laravel install.

## Files

- `composer.json` declares a path-repository dependency on `haakco/test-sections-laravel`.
- `artisan` is a lightweight PHP CLI stub with strict argument validation.
- `config/test-sections.php` defines fixture section metadata.
- `tests/smoke.php` simulates a tiny integration smoke test.

## Usage

```bash
php artisan test-sections:list
php artisan test-sections:run --parallel=2
```

Both commands intentionally fail with non-zero exit codes when arguments are invalid.
