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
      .option \github, do
        type: \string, alias: \g
        description: "publish into branch"
      .option \skip-dist, do
        type: \boolean, default: false
        description: "skip dist folder; publish only files listed in package.json files field plus necessary files"
  handler: (argv) ->
    # package-lock.json carries this package's own version ( top level + packages[""] ).
    # editing package.json version by hand leaves the lockfile stale, so the next
    # `npm i` produces an unrelated lock diff. refuse to publish ( npm or -g ) until
    # they match. skipped when there is no lockfile ( e.g. web projects ) or it
    # carries no top-level version. fix: run `npm i` and commit the lockfile.
    if fs.exists-sync "package-lock.json" =>
      lock-v = JSON.parse(fs.read-file-sync "package-lock.json" .toString!).version
      pkg-v = JSON.parse(fs.read-file-sync "package.json" .toString!).version
      if lock-v? and lock-v != pkg-v =>
        console.error "[ERROR] package-lock.json version (#lock-v) != package.json version (#pkg-v). run `npm i` and commit the lockfile first. exit.".red
        process.exit!

    src-folder = argv.f or "dist"
    no-dist = argv.skipDist or false
    work-folder = ".fedep/publish"
    release-branch = if !(argv.g?) => '' else if !argv.g => 'release' else argv.g
    if release-branch and !/^[.0-9a-zA-Z/]+$/.exec(release-branch) =>
      console.error "[ERROR] invalid specified release branch name #release-branch. exit.".red
      process.exit!
    if fs.exists-sync work-folder => fs-extra.remove-sync work-folder
    if !no-dist and !fs.exists-sync(src-folder) =>
      console.error "[ERROR] specified publish folder `".red + src-folder.brightYellow + "` doesn't exist. exit.".red
      process.exit!

    fs-extra.ensure-dir-sync work-folder
    if !no-dist => fs-extra.copy-sync src-folder, work-folder

    <[README README.md package.json LICENSE CHANGELOG.md]>.map ->
      if !fs.exists-sync(it) => return
      fs-extra.copy-sync it, path.join(work-folder, it)

    package-json = path.join(work-folder, "package.json")
    json = JSON.parse(fs.read-file-sync package-json .toString!)

    files = (json.files or [])
      .map (item) -> ret = glob.sync item
      .reduce(((a,b) -> a ++ b),[])
    if !no-dist and !argv.d =>
      re = new RegExp("^#{src-folder}")
      files = files.filter -> !re.exec(it)

    files.map (f) ->
      des = path.join(work-folder, f)
      fs-extra.ensure-dir-sync path.dirname(des)
      console.log " --","[COPY]".green, "#f -> #des"
      fs-extra.copy-sync(f, des)

    if !no-dist =>
      # rebase paths under src-folder to root. return null for paths outside src-folder --
      # those files are copied verbatim into work-folder, so their paths should be kept as is.
      rebase = (p) ->
        rel = path.relative(src-folder, p)
        if rel == '..' or rel.starts-with("..#{path.sep}") or path.is-absolute(rel) => null else rel
      # exports / bin values can be nested objects (e.g., conditional exports); rewrite recursively.
      rewrite = (v) ->
        if typeof(v) == \string =>
          rel = rebase(v)
          # `./` is required for a valid exports target.
          if rel? => "./" + rel else v
        else
          for k,sub of (v or {}) => v[k] = rewrite(sub)
          v
      <[style module main browser unpkg]>.map (field) ->
        if !json[field] => return
        rel = rebase(json[field])
        if rel? => json[field] = rel

      <[bin exports]>.map (field) ->
        if !json[field] => return
        json[field] = rewrite(json[field])

    # we still have to delete `files` so npm publish all files in worker-folder
    delete json.files
    fs.write-file-sync package-json, JSON.stringify(json)

    exec = (cmd) -> new Promise (res, rej) ->
      proc = child_process.spawn cmd.0, cmd.slice(1), {stdio: 'inherit'}
      proc.on \exit, -> if (it > 0) => rej new Error! else res!

    p = if !release-branch => exec(<[npm publish]> ++ [work-folder] ++ <[--access public]>)
    else make-github-release {branch: release-branch or 'release'}

    p.then -> fs.rm-sync work-folder, {recursive: true, force: true}
