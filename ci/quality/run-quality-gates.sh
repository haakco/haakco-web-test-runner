#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "$ROOT_DIR"

echo "Installing workspace dependencies"
pnpm install --frozen-lockfile

echo "Building packages"
pnpm run build:packages

echo "Checking package public API exports"
./ci/portability/check-public-api.sh

echo "Checking package source for forbidden consumer imports"
./ci/portability/check-no-consumer-imports.sh

echo "Running Playwright consumer portability checks"
./ci/portability/run-playwright-consumer.sh

if find "$ROOT_DIR/fixtures" -maxdepth 4 -type f -name artisan | grep -q .; then
  echo "Running Laravel consumer portability checks"
  ./ci/portability/run-laravel-consumer.sh
else
  echo "Skipping Laravel consumer portability checks (no fixture with artisan found)."
fi

echo "All quality gates passed."
