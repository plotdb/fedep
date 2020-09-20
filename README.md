# fedep

see also: 
 - frontend-dependencies - https://github.com/msurdi/frontend-dependencies
 - pancake - https://github.com/govau/pancake

frontend dependency installer. copy frontend modules to desired directory, with additional configurations in package.json:


  "scripts": {
    ...
    "postinstall": "./node_modules/.bin/lsc ./node_modules/static-npm/main.ls"
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

