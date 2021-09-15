# Change Logs

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
