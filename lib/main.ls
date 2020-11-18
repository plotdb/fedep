#!/usr/bin/env node
require! <[fs path fs-extra browserify yargs]>

argv = yargs
  .option \symlink, do
    alias: \s
    description: "use symlink instead of hard copy to make main folder. default true"
    type: \boolean
  .help \help
  .alias \help, \h
  .check (argv, options) -> return true
  .argv

use-symlink = if argv.s? => argv.s else true

fed = {root: '.', modules: []} <<< (JSON.parse(fs.read-file-sync "package.json" .toString!).frontendDependencies or {})

(fed.modules or []).map (obj) ->
  obj = if typeof(obj) == \string => {name: obj} else obj
  root = path.join("node_modules", obj.name)
  info = JSON.parse(fs.read-file-sync path.join(root, "package.json") .toString!)
  id = info._id or "#{info.name}@#{info.version}"
  if /\.\.|^\//.exec(id) => throw new Error("fedep: not supported name in module #{obj.name}.")
  [...name,version] = id.split("@")
  name = name.join \@
  desdir = path.join(fed.root, name, version)
  maindir = path.join(fed.root, name, "main")
  fs-extra.remove-sync desdir
  fs-extra.ensure-dir-sync desdir
  if obj.browserify =>
    b = browserify!
    b.require(obj.name)
    b.bundle!pipe fs.createWriteStream(path.join(desdir, "#name.js"))
    console.log " -- (from module) -> #desdir "
  else
    if obj.dir => srcdir = path.join(root, obj.dir)
    else
      srcdir = path.join(root, "dist")
      if !fs.exists-sync(srcdir) => srcdir = root
    fs-extra.copy-sync srcdir, desdir
    console.log " -- #srcdir -> #desdir "
  fs-extra.remove-sync maindir
  if use-symlink => fs-extra.ensure-symlink-sync desdir, maindir
  else fs-extra.copy-sync desdir, maindir
