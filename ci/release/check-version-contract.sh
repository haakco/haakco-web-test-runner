#!/usr/bin/env bash
set -euo pipefail

# Verifies the release contract documented in RELEASE.md:
#   - The latest repository tag (if any) must be v<version> where <version>
#     equals packages/test-sections-playwright/package.json#version.
#   - The latest CHANGELOG entry for the package must equal <version>.
#   - If the package version is greater than the latest tag, a changeset
#     file under .changeset/ (excluding README) must reference the
#     package. This guards the documented intent of the pending bump.
#   - If the package version is greater than the latest tag, the script
#     reports the pending release and exits 0 (development state). On a
#     commit that already carries a tag, the equality must hold exactly.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PACKAGE_JSON="$ROOT_DIR/packages/test-sections-playwright/package.json"
CHANGELOG="$ROOT_DIR/packages/test-sections-playwright/CHANGELOG.md"
CHANGESET_DIR="$ROOT_DIR/.changeset"

if [[ ! -f "$PACKAGE_JSON" ]]; then
	echo "Version contract check failed: missing $PACKAGE_JSON" >&2
	exit 1
fi

if [[ ! -f "$CHANGELOG" ]]; then
	echo "Version contract check failed: missing $CHANGELOG" >&2
	exit 1
fi

PACKAGE_VERSION="$(node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('$PACKAGE_JSON','utf8')).version)")"
if [[ -z "$PACKAGE_VERSION" ]]; then
	echo "Version contract check failed: package.json has no version" >&2
	exit 1
fi

CHANGELOG_VERSION="$(node -e "
const fs = require('fs');
const text = fs.readFileSync('$CHANGELOG','utf8');
const match = text.match(/^## ([0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?)\s*$/m);
process.stdout.write(match ? match[1] : '');
")"
if [[ -z "$CHANGELOG_VERSION" ]]; then
	echo "Version contract check failed: CHANGELOG has no ## version entry" >&2
	exit 1
fi

LATEST_TAG="$(git -C "$ROOT_DIR" tag --list 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname | head -n 1 || true)"
HEAD_HAS_TAG="false"
if [[ -n "$LATEST_TAG" ]] && git -C "$ROOT_DIR" rev-parse -q --verify "refs/tags/$LATEST_TAG^{commit}" >/dev/null 2>&1; then
	if git -C "$ROOT_DIR" rev-parse -q --verify "refs/tags/$LATEST_TAG" >/dev/null 2>&1; then
		if [[ "$(git -C "$ROOT_DIR" rev-list -n 1 "$LATEST_TAG")" == "$(git -C "$ROOT_DIR" rev-parse HEAD)" ]]; then
			HEAD_HAS_TAG="true"
		fi
	fi
fi

TAG_VERSION=""
if [[ -n "$LATEST_TAG" ]]; then
	TAG_VERSION="${LATEST_TAG#v}"
fi

failures=0

if [[ "$PACKAGE_VERSION" != "$CHANGELOG_VERSION" ]]; then
	echo "Version contract check failed: package.json ($PACKAGE_VERSION) != CHANGELOG ($CHANGELOG_VERSION)" >&2
	failures=$((failures + 1))
fi

if [[ -n "$TAG_VERSION" ]]; then
	if [[ "$HEAD_HAS_TAG" == "true" ]]; then
		if [[ "$PACKAGE_VERSION" != "$TAG_VERSION" ]]; then
			echo "Version contract check failed: HEAD is tagged $LATEST_TAG but package.json is $PACKAGE_VERSION" >&2
			failures=$((failures + 1))
		fi
	else
		if [[ "$PACKAGE_VERSION" < "$TAG_VERSION" ]]; then
			echo "Version contract check failed: package.json ($PACKAGE_VERSION) is older than latest tag ($LATEST_TAG)" >&2
			failures=$((failures + 1))
		elif [[ "$PACKAGE_VERSION" > "$TAG_VERSION" ]]; then
			if [[ ! -d "$CHANGESET_DIR" ]] || ! grep -rl "@haakco/test-sections-playwright" "$CHANGESET_DIR" --include="*.md" --exclude="README.md" >/dev/null 2>&1; then
				echo "Version contract check failed: package.json ($PACKAGE_VERSION) is newer than latest tag ($LATEST_TAG) but no changeset references @haakco/test-sections-playwright in .changeset/" >&2
				failures=$((failures + 1))
			fi
		fi
	fi
fi

if [[ "$failures" -gt 0 ]]; then
	exit 1
fi

if [[ "$HEAD_HAS_TAG" == "true" ]]; then
	echo "Version contract check passed: HEAD is tagged $LATEST_TAG and package/CHANGELOG match."
elif [[ -n "$TAG_VERSION" ]]; then
	echo "Version contract check passed: pending release from $LATEST_TAG to $PACKAGE_VERSION (HEAD is untagged)."
else
	echo "Version contract check passed: no prior tag, package version $PACKAGE_VERSION is the initial release candidate."
fi
