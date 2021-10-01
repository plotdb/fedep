#!/usr/bin/env node
var fs, path, os, fsExtra, browserify, yargs, argv, ret, localModule, useSymlink, fed, slice$ = [].slice;
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
}).help('help').alias('help', 'h').check(function(argv, options){
  return true;
}).argv;
if (argv.l) {
  ret = argv.l.split(':');
  localModule = {
    name: ret[0],
    path: path.resolve(ret[1].replace(/^~/, os.homedir()))
  };
} else {
  localModule = null;
}
useSymlink = argv.s != null ? argv.s : true;
fed = import$({
  root: '.',
  modules: []
}, JSON.parse(fs.readFileSync("package.json").toString()).frontendDependencies || {});
(fed.modules || []).map(function(obj){
  var root, info, id, ref$, i$, name, version, ret, that, desdir, maindir, p, srcdir;
  obj = typeof obj === 'string' ? {
    name: obj
  } : obj;
  if (localModule && obj.name !== localModule.name) {
    return;
  }
  if (localModule) {
    root = localModule.path;
  } else {
    root = path.join("node_modules", obj.name);
  }
  info = JSON.parse(fs.readFileSync(path.join(root, "package.json")).toString());
  id = info._id || info.name + "@" + info.version;
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
    } else {
      srcdir = path.join(root, "dist");
      if (!fs.existsSync(srcdir)) {
        srcdir = root;
      }
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
