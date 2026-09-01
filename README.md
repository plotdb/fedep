# fedep

Frontend dependency installer. copy frontend modules to desired directory, with additional configurations in package.json:

  "scripts": {
    ...
    "postinstall": "./node_modules/.bin/fedep"
  },
  "frontendDependencies": {
    "root": "web/static/assets/lib",
    "modules": [ "ldLazy" ]
  }


by executing `npx fedep` or invoking via postinstall when `npm i`, `fedep` will do:

  - lookup package with given name in `node_modules` folder.
  - once found, copy content to `<root>/<name>/<version>` from folders of give source packages in following priority:
    - `<dir>` folder if `dir` option is given ( see below ).
    - `dist` folder if `<dir>` is omitted, `dist` exists and `--use-dist` option is set to true.
    - otherwise, the whole package is copied.
  - build a symbolic link from <version> to /main/


Once configuration is prepared, run:

    npx fedep


for a quick setup of `frontendDependencies` field, run:

    npx fedep init

you still have to update its fields according to what you need.


Additionally, you can also use local repo for a specific module:

    npx fedep -l <some-module>:<path-to-local-repo>

Use semi comma `;` to separate multiple pairs of local repos:

    npx fedep -l "mod1:path-to-mod1;mod2:path-to-mod2;mod3:path-to-mod3"


## Modules Format

you can use either string or object to list modules to be used. e.g.,

    ["ldLazy", ...,  {name: "ldview"}, ...]


If object is used, it contains following fields:

 - `name`: module name
 - `browserify`: true/object if browserify this module.
   - if it's an object, the object will be passed to browserify as it's option object.
 - `dir`: subdir to copy in this module. default the whole module, if not specified
 - `link`: set true to use symlink instead of copying. default false.
   - always false if `browserify` is set to true.
 - `transpile`: add this object if you need to transpile module file, which contains following fields:
   - `files`: a list of file to transpile.
 - `optional`: default false. if true, ignore this entry if it can't be found, even if it's not in `optionalDependencies`.


## Publish

Use `npx fedep publish` to publish based on `dist` folder along with core files such as `package.json`. For example, say you have following directory structure:

 - dist
   - index.js
 - README.md
 - CHANGELOG.md
 - package.json
 - LICENSE

`npx fedep publish` merge above content into `.fedep/publish` as below:

 - .fedep/publish
   - index.js
   - README.md
   - CHANGELOG.md
   - package.json
   - LICENSE

and trigger `npm publish --access public .fedep/publish`. Additionally, `npx fedep publish` also alters copied `package.json` with following changes to reflect the change of the directory structure:

 - `files` field removed
 - file path in following fields are converted from relative to `root` to relative to `dist`:
   - `style`, `browser`, `module`, `main`, `unpkg`

`publish` command also publish files listed in `files` field, with their original directory structure, except `dist` folder. `dist` is by default removed with its content moved to root. To keep `dist` folder, use `--dup true` option:

    npx fedep publish --dup true

You can also use a different dist folder by `folder` option:

    npx fedep publish --folder another-dist

If you don't have a `dist` folder and want to publish only files listed in `package.json`'s `files` field along with core files, use `--skip-dist`:

    npx fedep publish --skip-dist

Additionally please note: it's convenient to add a publish script in `scripts` field, however this may cause trouble releasing your package because npm seems to prevent `publish` and trigger `npm publish` manually, causing issue during release.

So, please use alternative name such as `release`, as in the below example which release package to both npm and github:

    "scripts": {
        "release": "npx fedep publish; npx fedep publish -g"
    }
 

### Release on Github

Instead of using npm, if you want to publish to Github as a release, simply add `-g` option:

    npx fedep publish -g

by default the published files will be push into a specific branch, which by default is `release`. add an additional option to overwrite this default branch:

    npx fedep publish -g my-release-branch

### Tags

Releasing to a branch means a version exists in two places - the built files on
the release branch, and the source commit that produced them - so `publish -g`
tags both, and each tag says which side it is:

| tag | points at | use it to |
|:--|:--|:--|
| `dist/vX.Y.Z` | the release branch | install / depend on the built package |
| `src/vX.Y.Z`  | the source commit  | read, diff, bisect, or check out the source of a version |

    npm install github:owner/repo#dist/v1.2.3

Both sides carry a prefix, rather than only the newer one. Tagging just the
source and leaving the release bare would produce a repo where `v1.2.3` is a
build and `v1.2.4` is a source, with nothing in either name to tell them apart.

A bare `vX.Y.Z` means one of two things, and which one is answered by whether
the repo has a release branch at all:

 - **the repo has a release branch**: a bare tag predates fedep 1.8.0 and points
   at the built files. Old tags are left as they are - renaming them would break
   published release links and anything already installed against them.
 - **the repo has no release branch**: there is only one side, so there is
   nothing to disambiguate and a bare tag is the right name. This covers modules
   published to npm only, and modules whose build output is committed to the
   source branch ( fedep itself is one - its `files` is just the built `cli.js`,
   sitting on `master` ). Prefixing here would answer a question nobody can ask.

This is why `publish` without `-g` does not tag at all: an npm-only release has
no second side, and stamping `src/` on it would imply one exists.


### Releasing fedep itself

fedep does not release itself with `publish -g`, and should not: `-g` builds a
release branch, and fedep has no second side to put there - `files` is just the
built `cli.js`, committed on `master`. So it takes the bare-tag path described
above, by hand:

    ./build                                   # cli.js is build output - forgetting this ships the old one
    npm publish                                # files: ["cli.js"], already at the root, so plain npm publish
    git commit -am " - ... - bump version"     # CHANGELOG entry + version, per the existing convention
    git push origin master
    git tag v1.8.0 && git push origin v1.8.0   # bare, no prefix - see Tags above
    sed -n '/^## v1.8.0$/,/^## v1\.[0-9]/p' CHANGELOG.md | sed '1d;$d' \
      | gh release create v1.8.0 --title 1.8.0 --notes-file -

The last line is what `publish -g` would have done for you via `parse-changelog`.
Piping the CHANGELOG entry in also keeps the release body clean - notes pasted
into the Github web form come back with `\r\n` line endings.

Do the npm and the Github halves together. Skipping the second half is easy and
silent, and fedep has seven versions on npm with no tag or release to show for
them ( v1.4.2, v1.4.3, v1.4.6, v1.6.0, v1.7.0, v1.7.1, v1.7.3 ).


## Alternatives

see also: 
 - frontend-dependencies - https://github.com/msurdi/frontend-dependencies
 - pancake - https://github.com/govau/pancake


## TODO

add test.


## License

MIT
