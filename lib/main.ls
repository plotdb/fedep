#!/usr/bin/env node
require! <[@plotdb/colors fs path os fs-extra browserify yargs child_process glob readline]>
babel = require "@babel/core"

quit = -> console.error(Array.from(arguments).join('')); process.exit!
get-input = (q) ->
  (res) <- new Promise _
  rl = readline.createInterface {input: process.stdin, output: process.stdout}
  (ans) <- rl.question q, _
  rl.close!
  res answer

cmds = {}

