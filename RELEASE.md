# Release Contract

This repository ships one package, `@haakco/test-sections-playwright`, plus
workspace-level portability fixtures and CI helpers. The contract below is
forward-only: published tags and tarballs are preserved, and any change is
applied to the next release.

## Versioning Rule

- The repository tag is always `v<version>` where `<version>` matches
  `packages/test-sections-playwright/package.json` exactly.
- The package version follows Semantic Versioning.
- The CHANGELOG entry, the Git tag, and the published artifact version are the
  same `<version>`.
- A mechanical check (`ci/release/check-version-contract.sh`) runs in CI and
  locally. It fails the release if any of these disagree.

## Install Reference

Consumers install by Git reference. The exact reference matches the repository
tag:

```bash
# Git dependency, pinned to a specific tag
pnpm add 'github:haakco/web-test-runner#v1.3.0'
# or
npm install 'github:haakco/web-test-runner#v1.3.0'
```

For a clean tarball install (the same shape `pnpm pack` produces), use the
immutable commit SHA or the matching tag:

```bash
pnpm add 'github:haakco/web-test-runner#v1.3.0'
```

Do not invent a Docker-style `v1` alias for a Git dependency. Use the exact tag.

## Release Process

1. Add a changeset under `.changeset/` describing the change.
2. Run `pnpm version` (which calls `changeset version`) to align the package
   version and update CHANGELOGs.
3. Run `ci/release/check-version-contract.sh` to confirm the tag/package/CHANGELOG
   agree.
4. Run `./ci/quality/run-quality-gates.sh` and the full test suite.
5. Create and push the Git tag that matches the new package version.
6. Verify the tag and the package version are equal before announcing.

## Compatibility and Rollback

- Patch releases (`x.y.Z`) contain only fixes and are backward compatible.
- Minor releases (`x.Y.0`) add behavior but preserve the public API and CLI
  surface documented in `packages/test-sections-playwright/README.md`.
- Major releases (`X.0.0`) may change the public API or CLI shape.
- Rollback: pin to the previous Git tag or commit SHA. The tag is immutable.

## Maintained Aliases

None today. A future Verdaccio or npm channel may add a maintained alias. Until
that decision is implemented and documented, consumers use the Git tag as the
only supported reference.

## Mechanical Check

The check script verifies:

1. The latest Git tag (if any) is `v<version>` where `<version>` matches the
   `version` field in `packages/test-sections-playwright/package.json`.
2. The latest CHANGELOG entry under the package heading equals `<version>`.
3. If the package version has bumped since the last tag, the script exits with a
   clear instruction to tag and publish.

The check is part of `ci/quality/run-quality-gates.sh` and runs in CI on every
push and pull request.
