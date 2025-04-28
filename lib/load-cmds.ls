arg = yargs
for k,v of cmds => arg = arg.command v
arg.argv
