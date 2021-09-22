#!/usr/bin/env node
require! <[fs path os fs-extra browserify yargs]>

argv = yargs
  .option \symlink, do
    alias: \s
    description: "use symlink instead of hard copy to make main folder. default true"
    type: \boolean
  .option \local, do
    alias: \l
    description: "use local folder for a specific module, with module:dir syntax"
  .help \help
  .alias \help, \h
  .check (argv, options) -> return true
  .argv

if argv.l =>
  ret = argv.l.split(\:)
  local-module = name: ret.0, path: path.resolve(ret.1.replace(/^~/, os.homedir!))

else local-module = null

use-symlink = if argv.s? => argv.s else true

fed = {root: '.', modules: []} <<< (JSON.parse(fs.read-file-sync "package.json" .toString!).frontendDependencies or {})

(fed.modules or []).map (obj) ->
  obj = if typeof(obj) == \string => {name: obj} else obj
  if local-module and obj.name != local-module.name => return
  if local-module => root = local-module.path
  else root = path.join("node_modules", obj.name)
  info = JSON.parse(fs.read-file-sync path.join(root, "package.json") .toString!)
  id = info._id or "#{info.name}@#{info.version}"
  if /\.\.|^\//.exec(id) => throw new Error("fedep: not supported name in module #{obj.name}.")
  [...name,version] = id.split("@")

  # TODO we may need a better approach for version resolving if semver cannot be found.
  # if there is tag in version, just use it.
  if (ret = /#([a-zA-Z0-9_.-]+)$/.exec(version)) => version = ret.1
  # slash intervene path generation so replace all of them
  if /\//.exec(version) => version = version.replace(/\//g, '-')

  # name.0 might be empty due to namespaced module ( e.g., @loadingio/ldquery )
  # so we simply added it back.
  # name might contain patterns like `ldiconfont@git+ssh://git@...` so we discard things after 2nd elements.
  name = if name.0 => that else if name.1 => "@#{name.1}"
  # if there are any exception, just join them back to provide raw name.
  else name.join(\@)
  if local-module => desdir = path.join(fed.root, name, 'local')
  else desdir = path.join(fed.root, name, version)
  maindir = path.join(fed.root, name, "main")
  fs-extra.remove-sync desdir
  if !local-module => fs-extra.ensure-dir-sync desdir
  if obj.browserify =>
    p = new Promise (res, rej) ->
      b = browserify(if typeof(obj.browserify) == \object => obj.browserify)
      b.require(obj.name)
      b.bundle (e, buf) ->
        if e => return rej new Error(e)
        fs.write-file-sync path.join(desdir, "#name.js"), buf
        console.log " -- (module -> browserify) -> #desdir "
        res!
  else
    if obj.dir => srcdir = path.join(root, obj.dir)
    else
      srcdir = path.join(root, "dist")
      if !fs.exists-sync(srcdir) => srcdir = root
    if local-module => fs-extra.ensure-symlink-sync srcdir, desdir
    else fs-extra.copy-sync srcdir, desdir
    p = Promise.resolve!then -> console.log " -- #srcdir -> #desdir "
  p.then ->
    fs-extra.remove-sync maindir
    if use-symlink => fs-extra.ensure-symlink-sync desdir, maindir
    else fs-extra.copy-sync desdir, maindir
