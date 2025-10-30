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
  handler: (argv) ->
    src-folder = argv.f or "dist"
    work-folder = ".fedep/publish"
    release-branch = if !(argv.g?) => '' else if !argv.g => 'release' else argv.g
    if release-branch and !/^[.0-9a-zA-Z/]+$/.exec(release-branch) =>
      console.error "[ERROR] invalid specified release branch name #release-branch. exit.".red
      process.exit!
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

    <[bin]>.map (field) ->
      if !json[field] => return
      for k,v of (json[field] or {}) =>
        # `./` is required for a valid exports target.
        json[field][k] = "./" + path.relative(src-folder, json[field][k])

    <[exports]>.map (field) ->
      if !json[field] => return
      for k,v of (json[field] or {}) =>
        # `./` is required for a valid exports target.
        json[field][k] = "./" + path.relative(src-folder, json[field][k])

    # we still have to delete `files` so npm publish all files in worker-folder
    delete json.files
    fs.write-file-sync package-json, JSON.stringify(json)

    exec = (cmd) -> new Promise (res, rej) ->
      proc = child_process.spawn cmd.0, cmd.slice(1), {stdio: 'inherit'}
      proc.on \exit, -> if (it > 0) => rej new Error! else res!

    p = if !release-branch => exec(<[npm publish]> ++ [work-folder] ++ <[--access public]>)
    else make-github-release {branch: release-branch or 'release'}

    p.then -> fs.rm-sync work-folder, {recursive: true, force: true}
