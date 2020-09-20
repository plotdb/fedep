#!/usr/bin/env node
require! <[fs path fs-extra]>

fed = {root: '.', modules: []} <<< (JSON.parse(fs.read-file-sync "package.json" .toString!).frontendDependencies or {})

(fed.modules or []).map (n) ->
  root = path.join("node_modules", n)
  info = JSON.parse(fs.read-file-sync path.join(root, "package.json") .toString!)
  [name,version] = info._id.split("@")
  desdir = path.join(fed.root, name, version)
  maindir = path.join(fed.root, name, "main")
  srcdir = path.join(root, "dist")
  if !fs.exists-sync(srcdir) => srcdir = root
  fs-extra.ensure-dir-sync desdir
  fs-extra.copy-sync srcdir, desdir
  fs-extra.ensure-symlink-sync desdir, maindir
