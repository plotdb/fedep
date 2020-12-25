# 0.0.12

 - fix bug: browserify.bundle is asynchronous thus we need wait before we make `main` folder.
 - upgrade LiveScript version to 1.6.0.


# 0.0.11

 - take care of name/version that contains `@` or `/` characters.


# 0.0.10

 - release necessary file(s) only.


# 0.0.8

 - support browserify options.


# 0.0.7

 - fix bug: fedep log shows `undefined` for modules bundled with browserify


# 0.0.6

 - add `-s` option for disabling symlink in main. useful if we need commit the assets folder or use it in node_modules.
