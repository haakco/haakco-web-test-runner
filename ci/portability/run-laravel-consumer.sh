#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TARGET_DIR="${1:-}"

if [[ -z "$TARGET_DIR" ]]; then
  while IFS= read -r artisan_path; do
    TARGET_DIR="$(dirname "$artisan_path")"
    break
  done < <(find "$ROOT_DIR/fixtures" -maxdepth 4 -type f -name artisan | sort)
fi

if [[ -z "$TARGET_DIR" ]]; then
  echo "No Laravel fixture found under $ROOT_DIR/fixtures (expected an artisan file)." >&2
  echo "Pass fixture path explicitly: ci/portability/run-laravel-consumer.sh fixtures/<laravel-fixture>" >&2
  exit 1
fi

if [[ ! -f "$TARGET_DIR/artisan" ]]; then
  echo "Laravel artisan not found in fixture: $TARGET_DIR" >&2
  exit 1
fi

run_artisan_with_fallback() {
  local preferred_command="$1"
  local legacy_command="$2"
  shift 2

  local preferred_output=""
  local legacy_output=""

  if preferred_output="$(php artisan "$preferred_command" "$@" 2>&1)"; then
    printf '%s\n' "$preferred_output"
    return 0
  fi

  if legacy_output="$(php artisan "$legacy_command" "$@" 2>&1)"; then
    printf '%s\n' "$legacy_output"
    return 0
  fi

  echo "Failed to run artisan command '$preferred_command' (and legacy '$legacy_command')." >&2
  if [[ -n "$preferred_output" ]]; then
    echo "Preferred error output:" >&2
    echo "$preferred_output" >&2
  fi
  if [[ -n "$legacy_output" ]]; then
    echo "Legacy error output:" >&2
    echo "$legacy_output" >&2
  fi
  return 1
}

echo "Laravel fixture: $TARGET_DIR"
(
  cd "$TARGET_DIR"

  if command -v composer >/dev/null 2>&1 && [[ -f composer.json ]]; then
    composer install --no-interaction --prefer-dist
  fi

  run_artisan_with_fallback "test-sections:list" "haakco:test-sections:list"
  run_artisan_with_fallback "test-sections:run" "haakco:test-sections:run" --parallel=2
)

echo "Laravel consumer portability checks completed."
