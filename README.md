# fedep

see also: 
 - frontend-dependencies - https://github.com/msurdi/frontend-dependencies
 - pancake - https://github.com/govau/pancake

frontend dependency installer. copy frontend modules to desired directory, with additional configurations in package.json:


  "scripts": {
    ...
    "postinstall": "./node_modules/.bin/fedep"
  },
  "frontendDependencies": {
    "root": "web/static/assets/lib",
    "modules": [ "ldLazy" ]
  }

1. install via npm
2. auto copy to static/assets/lib/<name>/<version>/ after install
2. synlink <version> to /main/
3. can manually trigger copy action
4. work with bundler?

script({name, version, "dist/..."})

## modules format

you can use either string or object to list modules to be used. e.g.,

    ["ldLazy", {name: "ldview"}]


If object is used, it contains following fields:

 - name - module name
 - browserify - true if browserify this module
 - dir - subdir to copy in this module

