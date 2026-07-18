#!/usr/bin/env bash
set -euo pipefail

# Verifies the release contract documented in RELEASE.md:
#   - The latest repository tag (if any) must be v<version> where <version>
#     equals packages/test-sections-playwright/package.json#version.
#   - The latest CHANGELOG entry for the package must equal <version>.
#   - If the package version is greater than the latest tag, no changeset
#     may still reference the package. `changeset version` must consume the
#     release's changesets before the candidate can be tagged.
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

failures=0

compare_semver() {
	node - "$1" "$2" <<'NODE'
const [leftText, rightText] = process.argv.slice(2);
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function parse(value) {
  const match = semverPattern.exec(value);
  if (!match) {
    console.error(`Version contract check failed: invalid Semantic Version: ${value}`);
    process.exit(2);
  }
  const prerelease = match[4]?.split('.') ?? [];
  if (prerelease.some((identifier) => /^\d+$/.test(identifier) && identifier.length > 1 && identifier.startsWith('0'))) {
    console.error(`Version contract check failed: invalid Semantic Version: ${value}`);
    process.exit(2);
  }
  return {
    core: match.slice(1, 4).map(BigInt),
    prerelease,
  };
}

function compareIdentifiers(left, right) {
  const leftNumeric = /^\d+$/.test(left);
  const rightNumeric = /^\d+$/.test(right);
  if (leftNumeric && rightNumeric) {
    const leftNumber = BigInt(left);
    const rightNumber = BigInt(right);
    return leftNumber < rightNumber ? -1 : leftNumber > rightNumber ? 1 : 0;
  }
  if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
  return left < right ? -1 : left > right ? 1 : 0;
}

function compare(left, right) {
  for (let index = 0; index < left.core.length; index += 1) {
    if (left.core[index] !== right.core[index]) return left.core[index] < right.core[index] ? -1 : 1;
  }
  if (left.prerelease.length === 0 || right.prerelease.length === 0) {
    if (left.prerelease.length === right.prerelease.length) return 0;
    return left.prerelease.length === 0 ? 1 : -1;
  }
  const length = Math.max(left.prerelease.length, right.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    if (left.prerelease[index] === undefined) return -1;
    if (right.prerelease[index] === undefined) return 1;
    const result = compareIdentifiers(left.prerelease[index], right.prerelease[index]);
    if (result !== 0) return result < 0 ? -1 : 1;
  }
  return 0;
}

process.stdout.write(String(compare(parse(leftText), parse(rightText))));
NODE
}

LATEST_TAG=""
while IFS= read -r candidate_tag; do
	if [[ -z "$LATEST_TAG" ]] || [[ "$(compare_semver "${candidate_tag#v}" "${LATEST_TAG#v}")" == "1" ]]; then
		LATEST_TAG="$candidate_tag"
	fi
done < <(git -C "$ROOT_DIR" tag --list 'v[0-9]*.[0-9]*.[0-9]*')

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
		VERSION_ORDER="$(compare_semver "$PACKAGE_VERSION" "$TAG_VERSION")"
		if [[ "$VERSION_ORDER" == "-1" ]]; then
			echo "Version contract check failed: package.json ($PACKAGE_VERSION) is older than latest tag ($LATEST_TAG)" >&2
			failures=$((failures + 1))
		elif [[ "$VERSION_ORDER" == "1" ]]; then
			if [[ -d "$CHANGESET_DIR" ]] && grep -rl "@haakco/test-sections-playwright" "$CHANGESET_DIR" --include="*.md" --exclude="README.md" >/dev/null 2>&1; then
				echo "Version contract check failed: package.json ($PACKAGE_VERSION) is newer than latest tag ($LATEST_TAG) but an unconsumed changeset still references @haakco/test-sections-playwright in .changeset/" >&2
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
	VERSION_ORDER="$(compare_semver "$PACKAGE_VERSION" "$TAG_VERSION")"
	if [[ "$VERSION_ORDER" == "0" ]]; then
		echo "Version contract check passed: package/CHANGELOG match latest tag $LATEST_TAG (HEAD contains post-release changes)."
	else
		echo "Version contract check passed: pending release from $LATEST_TAG to $PACKAGE_VERSION (HEAD is untagged)."
	fi
else
	echo "Version contract check passed: no prior tag, package version $PACKAGE_VERSION is the initial release candidate."
fi
