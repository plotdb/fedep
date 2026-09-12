# Project context — index

Entry point for anyone (human or agent) working on this repo. Read this first,
then the linked docs.

fedep is a **frontend dependency installer**: it copies frontend modules out of
`node_modules` into a served `assets/lib/<name>/<version>/` tree (with a `main`
symlink), and can **publish** a package's built `dist/` as a GitHub release.

## Layout

- `cli.js` — compiled CLI (LiveScript source under `lib/`, build with `./build`).
- `./release` (`npm run release`) — releases fedep itself: npm publish + bare tag
  + github release, each step skipped if already done. See README "Releasing
  fedep itself". Not the same thing as the `publish` subcommand, which releases
  *other* packages.
- `lib/` — LiveScript sources: `default.ls` (the copy/link command), and the
  publish/release logic surfaced through `cli.js`.
- Two subcommands matter most:
  - default (`npx fedep`): copy/link `node_modules` modules → `assets/lib`.
    `-l <name>:<dir>` symlinks a **local** repo in place of the installed module
    (dev workflow); the linked dir must be a module root (has `package.json` +
    the built files, i.e. point at `<repo>/dist` for dist-based packages).
  - `publish` (`npx fedep publish [-g]`): publish the built `dist/` as a package.
    `-g` cuts a **GitHub** release on a release branch instead of npm.

## Publish tag scheme

`publish -g` tags both sides of a release (see README "Tags"):

| tag | points at | use it to |
|---|---|---|
| `dist/vX.Y.Z` | release branch (built, dist flattened to root) | install / depend on |
| `src/vX.Y.Z`  | source commit | read / diff / bisect |
| `vX.Y.Z`      | release branch (same commit as `dist/vX.Y.Z`) | npm `#semver:` ranges |

Consumers can depend on the built package either exactly
(`github:owner/repo#dist/vX.Y.Z`) or by range (`github:owner/repo#semver:^X.Y.Z`,
which resolves through the bare alias tag). The bare tag is created by
`publish -g` since v1.9.0 and can be disabled with `--no-alias-tag`.

## Documents

- [tasks/todo/](./tasks/todo/) — pending work (one `.md` per task).
- [tasks/done/](./tasks/done/) — completed tasks (move here when done).
