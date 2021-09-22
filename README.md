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
    - `dist` folder if `<dir>` is omitted and `dist` exists
    - otherwise, the whole package is copied.
  - build a symbolic link from <version> to /main/


Once configuration is prepared, run:

    npx fedep


You can also use local repo for a specific module:

    npx fedep -l <some-module>:<path-to-local-repo>


## Modules Format

you can use either string or object to list modules to be used. e.g.,

    ["ldLazy", ...,  {name: "ldview"}, ...]


If object is used, it contains following fields:

 - `name` - module name
 - `browserify` - true/object if browserify this module.
   - if it's an object, the object will be passed to browserify as it's option object.
 - `dir` - subdir to copy in this module. default `dist` if not specified


## Alternatives

see also: 
 - frontend-dependencies - https://github.com/msurdi/frontend-dependencies
 - pancake - https://github.com/govau/pancake


## TODO

add test.


## License

MIT
