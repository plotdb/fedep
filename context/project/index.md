# Project context — index

Entry point for anyone (human or agent) working on this repo. Read this first,
then the linked docs.

fedep is a **frontend dependency installer**: it copies frontend modules out of
`node_modules` into a served `assets/lib/<name>/<version>/` tree (with a `main`
symlink), and can **publish** a package's built `dist/` as a GitHub release.

## Layout

- `cli.js` — compiled CLI (LiveScript source under `lib/`, build with `./build`).
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

Consumers depend on the built package with an **exact ref**:
`npm install github:owner/repo#dist/vX.Y.Z`.

## Documents

- [tasks/todo/](./tasks/todo/) — pending work (one `.md` per task).
- [tasks/done/](./tasks/done/) — completed tasks (move here when done).

## Known trade-off

The prefixed `dist/` / `src/` tags are **not** npm-semver-parseable, so
`#semver:^X.Y.Z` no longer resolves a built release (it only matches bare
`vX.Y.Z` tags). Consumers lose automatic patch tracking and must pin
`#dist/vX.Y.Z` exactly. See [tasks/todo/semver-alias-tag.md](./tasks/todo/semver-alias-tag.md).
