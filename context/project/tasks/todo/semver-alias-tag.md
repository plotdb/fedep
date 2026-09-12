date: 2026/09/12

# Restore `#semver:` consumption for `publish -g` releases

## Problem

`publish -g` tags a release as `dist/vX.Y.Z` (release branch) and `src/vX.Y.Z`
(source). Neither is npm-semver-parseable, so a consumer can no longer write

    "svgedit": "github:loadingio/svgedit#semver:^0.5.0"

to auto-track patches — npm's `#semver:` only matches bare `vX.Y.Z` / `X.Y.Z`
tags. The consumer must pin the exact built ref `#dist/vX.Y.Z` and bump it by
hand every patch. (Older packages still worked with `#semver:^0.2.0` only
because they predate the prefixed scheme and had bare `vX` tags.)

Real case: loading.io v3 depends on svgedit; had to switch
`#semver:^0.2.0` → `#dist/v0.5.0`, losing auto-patch tracking.

## Proposed fix (option B)

When `publish -g` runs, **also** create a bare `vX.Y.Z` tag pointing at the same
release-branch commit as `dist/vX.Y.Z` (the built tree). Then `#semver:^X.Y.Z`
resolves again to the built package (npm ignores the prefixed `dist/`/`src/`
tags and picks the highest matching bare tag), while `dist/`/`src/` stay for
explicit/exact use.

- Make it opt-in or default-on via a flag, e.g. `--alias-tag` (default true?),
  so repos that don't want a bare tag can turn it off.
- The bare tag MUST point at the **built** (release-branch) commit, never the
  source commit — otherwise `#semver:` would install unbuilt source.

## Where

`cli.js` (LiveScript source under `lib/`):
- `makeRelease` — `gh release create dist/v${version} --target ${branch} …`
  creates the `dist/` tag on the release branch.
- `tagSource` — creates the `src/v${version}` tag on the source commit.
- Add a sibling step (call it after the release branch commit exists) that does
  `git tag v${version} <release-branch-commit>` + `git push origin v${version}`,
  guarded (skip if the tag already exists), mirroring `tagSource`'s existence
  check. Rebuild `cli.js` from `lib/` with `./build`.

## Acceptance

- After `fedep publish -g`, `git ls-remote --tags` shows `dist/vX.Y.Z`,
  `src/vX.Y.Z`, **and** `vX.Y.Z` (last two/three pointing appropriately).
- `npm install github:owner/repo#semver:^X.Y.0` installs the built package and
  auto-picks the highest `vX.Y.z` patch.
- Document the restored `#semver:` path in README's Tags section.
