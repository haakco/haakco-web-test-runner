#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FORBIDDEN_PATTERNS=("cb/web-gui" "tl-web-gui" "cb/api")

cd "$ROOT_DIR"

if rg -n --no-ignore --glob 'packages/**/src/**' -e "${FORBIDDEN_PATTERNS[0]}" -e "${FORBIDDEN_PATTERNS[1]}" -e "${FORBIDDEN_PATTERNS[2]}" packages; then
  echo "Found forbidden consumer imports in package source." >&2
  exit 1
fi

echo "No forbidden consumer imports found in package source."
