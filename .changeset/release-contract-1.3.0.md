---
"@haakco/test-sections-playwright": minor
---

Establishes a forward-only release contract for the Playwright runner. The
repository Git tag must now equal `packages/test-sections-playwright/package.json#version`
and the top CHANGELOG entry. Adds `ci/release/check-version-contract.sh` to
enforce this in CI. Aligns the package metadata to the upcoming `1.3.0` release
to correct the historical `0.2.0` / `v1.2.0` mismatch.
