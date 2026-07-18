#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TEST_ROOT="$(mktemp -d)"
trap 'rm -rf "$TEST_ROOT"' EXIT

new_fixture() {
	local name="$1"
	local package_version="$2"
	local tag_version="$3"
	local with_changeset="$4"
	local fixture="$TEST_ROOT/$name"

	mkdir -p "$fixture/ci/release" "$fixture/packages/test-sections-playwright" "$fixture/.changeset"
	cp "$ROOT_DIR/ci/release/check-version-contract.sh" "$fixture/ci/release/check-version-contract.sh"
	chmod +x "$fixture/ci/release/check-version-contract.sh"
	printf '{"version":"%s"}\n' "$package_version" >"$fixture/packages/test-sections-playwright/package.json"
	printf '# Changelog\n\n## %s\n\n- Fixture.\n' "$package_version" >"$fixture/packages/test-sections-playwright/CHANGELOG.md"
	if [[ "$with_changeset" == "true" ]]; then
		printf '%s\n' '---' '"@haakco/test-sections-playwright": patch' '---' >"$fixture/.changeset/pending.md"
	fi

	git -C "$fixture" init -q
	git -C "$fixture" config user.name 'Release Contract Test'
	git -C "$fixture" config user.email 'release-contract-test@example.invalid'
	git -C "$fixture" add .
	git -C "$fixture" commit -qm 'fixture'
	git -C "$fixture" tag "v$tag_version"
	git -C "$fixture" commit --allow-empty -qm 'post-tag development state'
	printf '%s\n' "$fixture"
}

equal_fixture="$(new_fixture equal 1.3.0 1.3.0 false)"
equal_output="$("$equal_fixture/ci/release/check-version-contract.sh")"
if [[ "$equal_output" != *'package/CHANGELOG match latest tag v1.3.0'* ]]; then
	echo "Expected equal untagged state to match the latest tag, got: $equal_output" >&2
	exit 1
fi

stable_fixture="$(new_fixture stable-after-prerelease 1.0.0 1.0.0-rc.1 false)"
git -C "$stable_fixture" tag v1.0.0 HEAD~1
stable_output="$("$stable_fixture/ci/release/check-version-contract.sh")"
if [[ "$stable_output" != *'package/CHANGELOG match latest tag v1.0.0 '* ]]; then
	echo "Expected stable v1.0.0 to sort after v1.0.0-rc.1, got: $stable_output" >&2
	exit 1
fi

newer_fixture="$(new_fixture newer 1.10.0 1.9.0 false)"
newer_output="$("$newer_fixture/ci/release/check-version-contract.sh")"
if [[ "$newer_output" != *'pending release from v1.9.0 to 1.10.0'* ]]; then
	echo "Expected 1.10.0 to be newer than v1.9.0, got: $newer_output" >&2
	exit 1
fi

older_fixture="$(new_fixture older 1.9.0 1.10.0 true)"
if older_output="$("$older_fixture/ci/release/check-version-contract.sh" 2>&1)"; then
	echo 'Expected 1.9.0 to be rejected as older than v1.10.0.' >&2
	exit 1
fi
if [[ "$older_output" != *'is older than latest tag (v1.10.0)'* ]]; then
	echo "Expected an older-version failure, got: $older_output" >&2
	exit 1
fi

unconsumed_changeset_fixture="$(new_fixture unconsumed-changeset 2.0.0 1.10.0 true)"
if unconsumed_changeset_output="$("$unconsumed_changeset_fixture/ci/release/check-version-contract.sh" 2>&1)"; then
	echo 'Expected a versioned release candidate with an unconsumed changeset to fail.' >&2
	exit 1
fi
if [[ "$unconsumed_changeset_output" != *'an unconsumed changeset still references @haakco/test-sections-playwright'* ]]; then
	echo "Expected an unconsumed-changeset failure, got: $unconsumed_changeset_output" >&2
	exit 1
fi

invalid_prerelease_fixture="$(new_fixture invalid-prerelease 1.0.0-01 1.0.0 false)"
if invalid_prerelease_output="$("$invalid_prerelease_fixture/ci/release/check-version-contract.sh" 2>&1)"; then
	echo 'Expected a numeric prerelease identifier with a leading zero to fail.' >&2
	exit 1
fi
if [[ "$invalid_prerelease_output" != *'invalid Semantic Version: 1.0.0-01'* ]]; then
	echo "Expected an invalid-SemVer failure, got: $invalid_prerelease_output" >&2
	exit 1
fi

echo 'Release version contract regression tests passed.'
