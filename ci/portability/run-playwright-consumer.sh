#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

run_consumer() {
  local name="$1"
  local fixture_dir="$2"
  local verify_cmd="$3"
  local list_cmd="$4"
  local run_cmd="$5"

  if [[ ! -d "$fixture_dir" ]]; then
    echo "[$name] Fixture directory not found: $fixture_dir" >&2
    return 1
  fi

  echo "[$name] verify"
  (
    cd "$fixture_dir"
    pnpm run "$verify_cmd"
  )

  echo "[$name] list"
  (
    cd "$fixture_dir"
    pnpm run "$list_cmd"
  )

  echo "[$name] run"
  (
    cd "$fixture_dir"
    pnpm run "$run_cmd"
  )
}

run_consumer \
  "consumer-simple" \
  "$ROOT_DIR/fixtures/consumer-simple" \
  "verify:sections" \
  "test:sections:list" \
  "test:sections"

run_consumer \
  "consumer-multi-role" \
  "$ROOT_DIR/fixtures/consumer-multi-role" \
  "verify:sections" \
  "list:sections" \
  "run:e2e"

echo "Playwright consumer portability checks completed."
