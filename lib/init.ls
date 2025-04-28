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
