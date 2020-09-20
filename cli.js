#!/usr/bin/env node
// Generated by LiveScript 1.3.1
var fs, path, fsExtra, fed;
fs = require('fs');
path = require('path');
fsExtra = require('fs-extra');
fed = import$({
  root: '.',
  modules: []
}, JSON.parse(fs.readFileSync("package.json").toString()).frontendDependencies || {});
(fed.modules || []).map(function(n){
  var root, info, ref$, name, version, desdir, maindir, srcdir;
  root = path.join("node_modules", n);
  info = JSON.parse(fs.readFileSync(path.join(root, "package.json")).toString());
  ref$ = info._id.split("@"), name = ref$[0], version = ref$[1];
  desdir = path.join(fed.root, name, version);
  maindir = path.join(fed.root, name, "main");
  srcdir = path.join(root, "dist");
  if (!fs.existsSync(srcdir)) {
    srcdir = root;
  }
  fsExtra.ensureDirSync(desdir);
  fsExtra.copySync(srcdir, desdir);
  return fsExtra.ensureSymlinkSync(desdir, maindir);
});
function import$(obj, src){
  var own = {}.hasOwnProperty;
  for (var key in src) if (own.call(src, key)) obj[key] = src[key];
  return obj;
}
