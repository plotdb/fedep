#!/usr/bin/env node
var colors, fs, path, os, fsExtra, browserify, yargs, argv, ret, localModules, cmd, json, k, useSymlink, fed, slice$ = [].slice;
colors = require('@plotdb/colors');
fs = require('fs');
path = require('path');
os = require('os');
fsExtra = require('fs-extra');
browserify = require('browserify');
yargs = require('yargs');
argv = yargs.option('symlink', {
  alias: 's',
  description: "use symlink instead of hard copy to make main folder. default true",
  type: 'boolean'
}).option('local', {
  alias: 'l',
  description: "use local folder for a specific module, with module:dir syntax"
}).option('use-dist', {
  type: 'boolean',
  description: "enable legacy mode which uses `dist/` folder as base files to copy"
}).help('help').alias('help', 'h').check(function(argv, options){
  return true;
}).argv;
if (argv.l) {
  ret = argv.l.split(';').map(function(it){
    return it.split(':');
  });
  localModules = ret.map(function(it){
    return {
      name: it[0],
      path: path.resolve(it[1].replace(/^~/, os.homedir()))
    };
  });
} else {
  localModules = [];
}
cmd = argv._[0];
if (cmd === 'init') {
  json = JSON.parse(fs.readFileSync('package.json').toString());
  if (json.frontendDependencies) {
    console.log("package.json has already inited. skipped. ");
  } else {
    json.frontendDependencies = {
      root: "web/static/assets/lib",
      modules: Array.from(new Set((function(){
        var results$ = [];
        for (k in json.dependencies) {
          results$.push(k);
        }
        return results$;
      }()).concat((function(){
        var results$ = [];
        for (k in json.devDependencies) {
          results$.push(k);
        }
        return results$;
      }()))))
    };
    fs.writeFileSync("package.json", JSON.stringify(json, null, '  '));
    console.log("package.json updated.");
  }
  process.exit();
}
useSymlink = argv.s != null ? argv.s : true;
fed = import$({
  root: '.',
  modules: []
}, JSON.parse(fs.readFileSync("package.json").toString()).frontendDependencies || {});
(fed.modules || []).map(function(obj){
  var localModule, root, info, id, mainFile, ref$, i$, name, version, ret, that, desdir, maindir, p, srcdir, srcFile, desFile;
  obj = typeof obj === 'string' ? {
    name: obj
  } : obj;
  localModule = localModules.filter(function(it){
    return it.name === obj.name;
  })[0];
  if (localModules.length && !localModule) {
    return;
  }
  if (localModule) {
    root = localModule.path;
  } else {
    root = path.join("node_modules", obj.name);
  }
  info = JSON.parse(fs.readFileSync(path.join(root, "package.json")).toString());
  id = info._id || info.name + "@" + info.version;
  mainFile = {
    js: [info.browser, info.main].filter(function(it){
      return /\.js/.exec(it);
    })[0],
    css: [info.style, info.browser, info.main].filter(function(it){
      return /\.css/.exec(it);
    })[0]
  };
  if (/\.\.|^\//.exec(id)) {
    throw new Error("fedep: not supported name in module " + obj.name + ".");
  }
  ref$ = id.split("@"), name = 0 < (i$ = ref$.length - 1) ? slice$.call(ref$, 0, i$) : (i$ = 0, []), version = ref$[i$];
  if (ret = /#([a-zA-Z0-9_.-]+)$/.exec(version)) {
    version = ret[1];
  }
  if (/\//.exec(version)) {
    version = version.replace(/\//g, '-');
  }
  name = (that = name[0])
    ? that
    : name[1]
      ? "@" + name[1]
      : name.join('@');
  if (localModule) {
    desdir = path.join(fed.root, name, 'local');
  } else {
    desdir = path.join(fed.root, name, version);
  }
  maindir = path.join(fed.root, name, "main");
  fsExtra.removeSync(desdir);
  if (!localModule) {
    fsExtra.ensureDirSync(desdir);
  }
  if (obj.browserify) {
    p = new Promise(function(res, rej){
      var b;
      b = browserify(typeof obj.browserify === 'object' ? obj.browserify : void 8);
      b.require(obj.name);
      return b.bundle(function(e, buf){
        if (e) {
          return rej(new Error(e));
        }
        fs.writeFileSync(path.join(desdir, name + ".js"), buf);
        console.log(" -- (module -> browserify) -> " + desdir + " ");
        return res();
      });
    });
  } else {
    if (obj.dir) {
      srcdir = path.join(root, obj.dir);
    } else if (argv.useDist) {
      srcdir = path.join(root, "dist");
      if (!fs.existsSync(srcdir)) {
        srcdir = root;
      }
    } else {
      srcdir = root;
    }
    if (localModule || obj.link) {
      fsExtra.removeSync(desdir);
      fsExtra.ensureSymlinkSync(srcdir, desdir);
    } else {
      fsExtra.copySync(srcdir, desdir);
    }
    p = Promise.resolve().then(function(){
      return console.log(" -- " + srcdir + " -> " + desdir + " ");
    });
    if (mainFile.js && !localModule) {
      srcFile = path.join(root, mainFile.js);
      desFile = path.join(desdir, "index.js");
      if (!fs.existsSync(desFile)) {
        fsExtra.copySync(srcFile, desFile);
        console.log("[JS ]".green, " -- " + srcFile + " --> " + desFile + " ");
      }
    }
    if (mainFile.css && !localModule) {
      srcFile = path.join(root, mainFile.css);
      desFile = path.join(desdir, "index.css");
      if (!fs.existsSync(desFile)) {
        fsExtra.copySync(srcFile, desFile);
        console.log("[CSS]".green, " -- " + srcFile + " --> " + desFile + " ");
      }
    }
  }
  return p.then(function(){
    fsExtra.removeSync(maindir);
    if (useSymlink) {
      return fsExtra.ensureSymlinkSync(desdir, maindir);
    } else {
      return fsExtra.copySync(desdir, maindir);
    }
  });
});
function import$(obj, src){
  var own = {}.hasOwnProperty;
  for (var key in src) if (own.call(src, key)) obj[key] = src[key];
  return obj;
}
