# Change Logs

## v1.4.0 (upcoming)

 - support `npx fedep license` command


## v1.3.0

 - support `optional` in module format.


## v1.2.0

 - support transpilation on demand.


## v1.1.12

 - skip optional dependencies that are not installed
 - tweak message style
 - upgrade dependencies


## v1.1.11

 - fix bug: `srcdir` contain keywrods that are filtered out, making a empty lib folder.
   - 1.1.10 patched `srcdir` however the result still get blocked by filter rules of `copySync`.


## v1.1.10

 - fix bug: `srcdir` contain keywrods that are filtered out, making a empty lib folder.


## v1.1.9

 - fix bug: `node_modules` lookup may fall into endless loop and halt the program.


## v1.1.8

 - support modules from parent `node_modules`


## v1.1.7

 - fix bug: dup installation of local module: ext modules incorrect due to local module filtering bug.


## v1.1.6

 - make `-s false` work for symlink ( e.g., `local` ) folder
 - warn but install modules not listed in fedep modules in `pacakge.json` ( usually from `-l` option )


## v1.1.5

 - still symlink if srcdir is not a symlink but root is a symlink. usually happens when we specify `dir` in config.


## v1.1.4

 - don`t copy JS / CSS files based on `browser` / `style` field if `main` folder is by link instead of by copying.
 - instead of copying, making a symlink by following symlink in `node_modules`.
   - symlink usually is for local dev files, which may contains many things we dont need as a module.
     thus copying isn't the best way which may copy files like `.git` or `node_modules`.


## v1.1.3

 - copy contente of symlink if module in `node_modules` is a symbolic link.


## v1.1.2

 - separate commands with yargs sub command features
 - support `folder` (default `dist`) and `dup` (default `false`) options in `publish` command.
 - tweak messages


## v1.1.1

 - make `publish` keep files in `files` but still dup `dist` files in root


## v1.1.0

 - add `publish` command, which publish `dist` folder as root along with core files such as `package.json`, etc


## v1.0.1

 - add missed `@plotdb/colors` module


## v1.0.0

 - copy the complete module ( skip `node_modules` if any ) instead of `dist` only.
   - for legacy support, still support `dist` copying with `--use-dist` option.
 - support multiple pairs, separated by `;` for -l option
 - generate a `index.js` and `index.css` file automatically per `package.json` describe if they doesn't overwrite anything.


## v0.0.17

 - add `init` command ( `npx fedep init` ) for quickly setup a `frontendDependencies` entry.


## v0.0.16

 - support `link` option for linking from src to des.
 - remove livescript header


## v0.0.15

 - use symlink instead hard copy when using `-l`.


## v0.0.14

 - add `local` option for installing frontend modules from local repo.


## v0.0.13

 - bump `path-parse` and `elliptic` version for vulnerability fixing


## v0.0.12

 - fix bug: browserify.bundle is asynchronous thus we need wait before we make `main` folder.
 - upgrade LiveScript version to 1.6.0.


## v0.0.11

 - take care of name/version that contains `@` or `/` characters.


## v0.0.10

 - release necessary file(s) only.


## v0.0.8

 - support browserify options.


## v0.0.7

 - fix bug: fedep log shows `undefined` for modules bundled with browserify


## v0.0.6

 - add `-s` option for disabling symlink in main. useful if we need commit the assets folder or use it in node_modules.
