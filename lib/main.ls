#!/usr/bin/env node
require! <[@plotdb/colors fs path os fs-extra browserify yargs child_process glob]>

quit = -> console.error(Array.from(arguments).join('')); process.exit!

cmds = {}
cmds.default =
  command: \$0
  desc: 'copy module code to specified frontend folders'
  builder: (yargs) ->
    yargs
      .option \symlink, do
        alias: \s
        description: "use symlink instead of hard copy to make main folder. default true"
        type: \boolean
      .option \local, do
        alias: \l
        description: "use local folder for a specific module, with module:dir syntax"
      .option \use-dist, do
        type: \boolean
        description: "enable legacy mode which uses `dist/` folder as base files to copy"
  handler: (argv) ->

    if argv.l =>
      ret = argv.l.split(\;).map -> it.split(\:)
      local-modules = ret.map -> name: it.0, path: path.resolve(it.1.replace(/^~/, os.homedir!))
    else local-modules = []

    use-symlink = if argv.s? => argv.s else true

    pkg = JSON.parse(fs.read-file-sync "package.json" .toString!)
    fed = {root: '.', modules: []} <<< (pkg.frontendDependencies or {})

    ext-modules = local-modules.filter((o) -> !(fed.modules.filter(->it == o.name).length))
    if ext-modules.length =>
      console.warn "[WARN] following modules are not listed in fedep modules. still installed:".yellow
      console.warn ext-modules.map(->" - #{it.name}").join(\\n).yellow
      console.warn ""
      fed.modules ++= ext-modules.map(-> it.name)

    skips = []
    all-promises = (fed.modules or []).map (obj) ->
      obj = if typeof(obj) == \string => {name: obj} else obj
      local-module = local-modules.filter(-> it.name == obj.name).0
      if local-modules.length and !local-module => return
      if local-module => root = local-module.path
      else
        base = '.'
        while path.resolve(base) != \/
          root = path.resolve(path.join base, \node_modules, obj.name)
          if fs.exists-sync(path.join(root, \package.json)) => break
          base = path.join(base, \..)
        root = path.relative('.', root)

      if !fs.exists-sync(path.join root, \package.json) =>
        if !(pkg.optionalDependencies or {})[obj.name] =>
          quit " -- [ERROR] Module `".red, obj.name.brightYellow, "` is not found. Failed.".red
        skips.push(name: obj.name, reason: "it is an optional dependency and is not installed")
        return console.warn [
          " -- [WARN] Optional dependencies `".yellow, obj.name.brightYellow, "` is not found. Skipped.".yellow
        ].join('')

      info = JSON.parse(fs.read-file-sync path.join(root, "package.json") .toString!)

      id = info._id or "#{info.name}@#{info.version}"

      main-file =
        js: [info.browser, info.main].filter(-> /\.js/.exec(it)).0
        css: [info.style, info.browser, info.main].filter(-> /\.css/.exec(it)).0

      if /\.\.|^\//.exec(id) =>
        quit " -- [ERROR] not supported id `#{id}` in module `".red, obj.name.brightYellow, "`.".red
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
            console.log " --", "(module -> browserify)".green, "-> #desdir "
            res!
      else
        if obj.dir => srcdir = path.join(root, obj.dir)
        else if argv.useDist
          srcdir = path.join(root, "dist")
          if !fs.exists-sync(srcdir) => srcdir = root
        else srcdir = root
        if local-module or obj.link =>
          fs-extra.remove-sync desdir
          fs-extra.ensure-symlink-sync srcdir, desdir
        else
          if fs.lstat-sync srcdir .is-symbolic-link! =>
            obj.link = true
            fs-extra.remove-sync desdir
            real-srcdir = path.resolve(path.join(path.dirname(srcdir), fs.readlink-sync(srcdir)))
            fs-extra.ensure-symlink-sync real-srcdir, desdir
          else if fs.lstat-sync root .is-symbolic-link! =>
            obj.link = true
            fs-extra.remove-sync desdir
            fs-extra.ensure-symlink-sync srcdir, desdir
          else
            fs-extra.copy-sync(
              srcdir, desdir,
              # for parent node_modules, there will always be a dot before `node_modules`.
              # but we want to remove files under `node_modules` inside srcdir,
              # which will be `/[^.]/node_modules`
              {dereference: true, filter: -> !/.+[^.]\/node_modules|\/\.git/.exec(it)}
            )

        p = Promise.resolve!then -> console.log " -- #srcdir -> #desdir "
        if !obj.link and main-file.js and !local-module =>
          src-file = path.join(root, main-file.js)
          des-file = path.join(desdir, "index.js")
          if !fs.exists-sync(des-file) =>
            fs-extra.copy-sync src-file, des-file
            console.log " --", "[JS]".green, "#src-file --> #des-file "

        if !obj.link and main-file.css and !local-module =>
          src-file = path.join(root, main-file.css)
          des-file = path.join(desdir, "index.css")
          if !fs.exists-sync(des-file) =>
            fs-extra.copy-sync src-file, des-file
            console.log " --", "[CSS]".green, "#src-file --> #des-file "

      p.then ->
        fs-extra.remove-sync maindir
        if use-symlink => fs-extra.ensure-symlink-sync desdir, maindir
        else if fs.lstat-sync desdir .is-symbolic-link! => fs-extra.copy-sync srcdir, maindir
        else fs-extra.copy-sync desdir, maindir
    Promise.all all-promises .then ->
      if skips.length =>
        console.warn "[WARN] Skipped module#{if skips.length > 1 => \s else ''}:".yellow
        skips.map (s) -> console.warn " -", s.name.brightYellow, if s.reason => "(#{s.reason})".gray else ''


cmds.init =
  command: \init
  desc: "initialize `frontendDependencies` field in `package.json`"
  handler: (argv) ->
    json = JSON.parse(fs.read-file-sync 'package.json' .toString!)
    if json.frontendDependencies =>
      console.log "package.json has already inited. skipped. "
    else
      json.frontendDependencies = {
        root: "web/static/assets/lib"
        modules: Array.from(new Set([k for k of json.dependencies] ++ [k for k of json.devDependencies]))
      }
      fs.write-file-sync "package.json", JSON.stringify(json, null, '  ')
      console.log "package.json updated."


cmds.publish =
  command: \publish
  desc: 'publish module to npm with specified folder content in root folder'
  builder: (yargs) ->
    yargs
      .option \dup, do
        type: \boolean, default: false, alias: \d
        description: "copy instead move when true. default false"
      .option \folder, do
        type: \string, default: \dist, alias: \f
        description: "default folder to publish"
  handler: (argv) ->
    src-folder = argv.f or "dist"
    work-folder = ".fedep/publish"
    if fs.exists-sync work-folder => fs-extra.remove-sync work-folder
    if !fs.exists-sync(src-folder) =>
      console.error "[ERROR] specified publish folder `".red + src-folder.brightYellow + "` doesn't exist. exit.".red
      process.exit!

    fs-extra.ensure-dir-sync work-folder
    fs-extra.copy-sync src-folder, work-folder

    <[README README.md package.json LICENSE CHANGELOG.md]>.map ->
      if !fs.exists-sync(it) => return
      fs-extra.copy-sync it, path.join(work-folder, it)

    package-json = path.join(work-folder, "package.json")
    json = JSON.parse(fs.read-file-sync package-json .toString!)

    files = (json.files or [])
      .map (item) -> ret = glob.sync item
      .reduce(((a,b) -> a ++ b),[])
    if !argv.d =>
      re = new RegExp("^#{src-folder}")
      files = files.filter -> !re.exec(it)

    files.map (f) ->
      des = path.join(work-folder, f)
      fs-extra.ensure-dir-sync path.dirname(des)
      console.log " --","[COPY]".green, "#f -> #des"
      fs-extra.copy-sync(f, des)

    <[style module main browser unpkg]>.map (field) ->
      if !json[field] => return
      json[field] = path.relative(src-folder, json[field])

    # we still have to delete `files` so npm publish all files in worker-folder
    delete json.files
    fs.write-file-sync package-json, JSON.stringify(json)

    exec = (cmd) -> new Promise (res, rej) ->
      proc = child_process.spawn cmd.0, cmd.slice(1), {stdio: 'inherit'}
      proc.on \exit, -> if (it > 0) => rej new Error! else res!

    exec(<[npm publish]> ++ [work-folder] ++ <[--access public]>)
      .then -> fs.rm-sync work-folder, {recursive: true, force: true}


yargs
  .command cmds.init
  .command cmds.publish
  .command cmds.default
  .argv
