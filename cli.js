#!/usr/bin/env node
var colors, fs, path, os, fsExtra, browserify, yargs, child_process, glob, readline, babel, quit, getInput, cmds, makeGithubRelease, arg, k, v, slice$ = [].slice;
colors = require('@plotdb/colors');
fs = require('fs');
path = require('path');
os = require('os');
fsExtra = require('fs-extra');
browserify = require('browserify');
yargs = require('yargs');
child_process = require('child_process');
glob = require('glob');
readline = require('readline');
babel = require("@babel/core");
quit = function(){
  console.error(Array.from(arguments).join(''));
  return process.exit();
};
getInput = function(q){
  return new Promise(function(res){
    var rl;
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    return rl.question(q, function(ans){
      rl.close();
      return res(ans);
    });
  });
};
cmds = {};
cmds['default'] = {
  command: '$0',
  desc: 'copy module code to specified frontend folders',
  builder: function(yargs){
    return yargs.option('symlink', {
      alias: 's',
      description: "use symlink instead of hard copy to make main folder. default true",
      type: 'boolean'
    }).option('local', {
      alias: 'l',
      description: "use local folder for a specific module, with module:dir syntax"
    }).option('use-dist', {
      type: 'boolean',
      description: "enable legacy mode which uses `dist/` folder as base files to copy"
    });
  },
  handler: function(argv){
    var ret, localModules, useSymlink, pkg, fed, extModules, skips, allPromises;
    if (argv.l) {
      ret = argv.l.split(';').map(function(it){
        return it.split(':');
      });
      localModules = ret.map(function(it){
        return {
          name: it[0],
          path: path.resolve(it[1].replace(/^~/, os.homedir()))
        };
      });
    } else {
      localModules = [];
    }
    useSymlink = argv.s != null ? argv.s : true;
    pkg = JSON.parse(fs.readFileSync("package.json").toString());
    fed = import$({
      root: '.',
      modules: []
    }, pkg.frontendDependencies || {});
    extModules = localModules.filter(function(o){
      return !fed.modules.filter(function(it){
        return it === o.name;
      }).length;
    });
    if (extModules.length) {
      console.warn("[WARN] following modules are not listed in fedep modules. still installed:".yellow);
      console.warn(extModules.map(function(it){
        return " - " + it.name;
      }).join('\n').yellow);
      console.warn("");
      fed.modules = fed.modules.concat(extModules.map(function(it){
        return it.name;
      }));
    }
    skips = [];
    allPromises = (fed.modules || []).map(function(obj){
      var localModule, root, base, info, id, mainFile, ref$, i$, name, version, ret, that, desdir, maindir, p, srcdir, realSrcdir, ps, srcFile, desFile;
      obj = typeof obj === 'string' ? {
        name: obj
      } : obj;
      localModule = localModules.filter(function(it){
        return it.name === obj.name;
      })[0];
      if (localModules.length && !localModule) {
        return;
      }
      if (localModule) {
        root = localModule.path;
      } else {
        base = '.';
        while (path.resolve(base) !== '/') {
          root = path.resolve(path.join(base, 'node_modules', obj.name));
          if (fs.existsSync(path.join(root, 'package.json'))) {
            break;
          }
          base = path.join(base, '..');
        }
        root = path.relative('.', root);
      }
      if (!fs.existsSync(path.join(root, 'package.json'))) {
        if (!(pkg.optionalDependencies || {})[obj.name] && !obj.optional) {
          quit(" -- [ERROR] Module `".red, obj.name.brightYellow, "` is not found. Failed.".red);
        }
        skips.push({
          name: obj.name,
          reason: "it is an optional dependency and is not installed"
        });
        return console.warn([" -- [WARN] Optional dependencies `".yellow, obj.name.brightYellow, "` is not found. Skipped.".yellow].join(''));
      }
      info = JSON.parse(fs.readFileSync(path.join(root, "package.json")).toString());
      id = info._id || info.name + "@" + info.version;
      mainFile = {
        js: [info.browser, info.main].filter(function(it){
          return /\.js/.exec(it);
        })[0],
        css: [info.style, info.browser, info.main].filter(function(it){
          return /\.css/.exec(it);
        })[0]
      };
      if (/\.\.|^\//.exec(id)) {
        quit((" -- [ERROR] not supported id `" + id + "` in module `").red, obj.name.brightYellow, "`.".red);
      }
      ref$ = id.split("@"), name = 0 < (i$ = ref$.length - 1) ? slice$.call(ref$, 0, i$) : (i$ = 0, []), version = ref$[i$];
      if (ret = /#([a-zA-Z0-9_.-]+)$/.exec(version)) {
        version = ret[1];
      }
      if (/\//.exec(version)) {
        version = version.replace(/\//g, '-');
      }
      name = (that = name[0])
        ? that
        : name[1]
          ? "@" + name[1]
          : name.join('@');
      if (localModule) {
        desdir = path.join(fed.root, name, 'local');
      } else {
        desdir = path.join(fed.root, name, version);
      }
      maindir = path.join(fed.root, name, "main");
      fsExtra.removeSync(desdir);
      if (!localModule) {
        fsExtra.ensureDirSync(desdir);
      }
      if (obj.browserify) {
        p = new Promise(function(res, rej){
          var b;
          b = browserify(typeof obj.browserify === 'object' ? obj.browserify : void 8);
          b.require(obj.name);
          return b.bundle(function(e, buf){
            if (e) {
              return rej(new Error(e));
            }
            fs.writeFileSync(path.join(desdir, name + ".js"), buf);
            console.log(" --", "(module -> browserify)".green, "-> " + desdir + " ");
            return res();
          });
        });
      } else {
        if (obj.dir) {
          srcdir = path.join(root, obj.dir);
        } else if (argv.useDist) {
          srcdir = path.join(root, "dist");
          if (!fs.existsSync(srcdir)) {
            srcdir = root;
          }
        } else {
          srcdir = root;
        }
        if (localModule || obj.link) {
          fsExtra.removeSync(desdir);
          fsExtra.ensureSymlinkSync(srcdir, desdir);
        } else {
          if (fs.lstatSync(srcdir).isSymbolicLink()) {
            obj.link = true;
            fsExtra.removeSync(desdir);
            realSrcdir = path.resolve(path.join(path.dirname(srcdir), fs.readlinkSync(srcdir)));
            fsExtra.ensureSymlinkSync(realSrcdir, desdir);
          } else if (fs.lstatSync(root).isSymbolicLink()) {
            obj.link = true;
            fsExtra.removeSync(desdir);
            fsExtra.ensureSymlinkSync(srcdir, desdir);
          } else {
            fsExtra.copySync(srcdir, desdir, {
              dereference: true,
              filter: function(it){
                return !/.+[^.]\/node_modules|\/\.git/.exec(it);
              }
            });
          }
          if (obj.transpile) {
            ps = ((ref$ = obj.transpile).files || (ref$.files = [])).map(function(f){
              return new Promise(function(res, rej){
                var babelOpt, src, des;
                babelOpt = {
                  presets: ['@babel/preset-env']
                };
                src = path.join(srcdir, f);
                des = path.join(desdir, f);
                return babel.transform(fs.readFileSync(src).toString(), babelOpt, function(err, result){
                  if (err) {
                    console.error("[ERROR] transpile ".red + f.brightYellow + " failed: ".red, err);
                    return rej(err);
                  }
                  fs.writeFileSync(des, result.code);
                  console.log(" -- " + "[JS/Transpile]".green + (" -> " + des));
                  return res();
                });
              });
            });
            p = Promise.all(ps)['catch'](function(e){
              console.error("[ERROR] exception during transpilatio: ".red, e);
              console.error("exit.".red);
              return process.exit();
            });
          }
        }
        p = (p || Promise.resolve()).then(function(){
          return console.log(" -- " + srcdir + " -> " + desdir + " ");
        });
        if (!obj.link && mainFile.js && !localModule) {
          srcFile = path.join(root, mainFile.js);
          desFile = path.join(desdir, "index.js");
          if (!fs.existsSync(desFile)) {
            fsExtra.copySync(srcFile, desFile);
            console.log(" --", "[JS]".green, srcFile + " --> " + desFile + " ");
          }
        }
        if (!obj.link && mainFile.css && !localModule) {
          srcFile = path.join(root, mainFile.css);
          desFile = path.join(desdir, "index.css");
          if (!fs.existsSync(desFile)) {
            fsExtra.copySync(srcFile, desFile);
            console.log(" --", "[CSS]".green, srcFile + " --> " + desFile + " ");
          }
        }
      }
      return p.then(function(){
        fsExtra.removeSync(maindir);
        if (useSymlink) {
          return fsExtra.ensureSymlinkSync(desdir, maindir);
        } else if (fs.lstatSync(desdir).isSymbolicLink()) {
          return fsExtra.copySync(srcdir, maindir);
        } else {
          return fsExtra.copySync(desdir, maindir);
        }
      });
    });
    return Promise.all(allPromises).then(function(){
      if (skips.length) {
        console.warn(("[WARN] Skipped module" + (skips.length > 1 ? 's' : '') + ":").yellow);
        return skips.map(function(s){
          return console.warn(" -", s.name.brightYellow, s.reason ? ("(" + s.reason + ")").gray : '');
        });
      }
    });
  }
};
cmds.init = {
  command: 'init',
  desc: "initialize `frontendDependencies` field in `package.json`",
  handler: function(argv){
    var json, k;
    json = JSON.parse(fs.readFileSync('package.json').toString());
    if (json.frontendDependencies) {
      return console.log("package.json has already inited. skipped. ");
    } else {
      json.frontendDependencies = {
        root: "web/static/assets/lib",
        modules: Array.from(new Set((function(){
          var results$ = [];
          for (k in json.dependencies) {
            results$.push(k);
          }
          return results$;
        }()).concat((function(){
          var results$ = [];
          for (k in json.devDependencies) {
            results$.push(k);
          }
          return results$;
        }()))))
      };
      fs.writeFileSync("package.json", JSON.stringify(json, null, '  '));
      return console.log("package.json updated.");
    }
  }
};
makeGithubRelease = function(arg$){
  var branch, ref$, exec, validateRemote, validateBranch, validateVersion, getVersion, parseChangelog, makeRelease, isGitWorkTree, ensureReleaseBranch, updateReleaseBranch, ghStatus, version, ret;
  branch = (ref$ = arg$.branch) != null ? ref$ : "release";
  exec = function(opt){
    opt == null && (opt = {});
    return new Promise(function(res, rej){
      var ref$, cmd, input, out, proc;
      if (Array.isArray(opt)) {
        ref$ = [opt, null], cmd = ref$[0], input = ref$[1];
      } else {
        cmd = opt.cmd, input = opt.input;
      }
      out = [];
      proc = child_process.spawn(cmd[0], cmd.slice(1), {
        stdio: input
          ? ['pipe', 'pipe', 'pipe']
          : ['ignore', 'pipe', 'pipe']
      });
      proc.stdout.on('data', function(it){
        return out.push(it.toString());
      });
      proc.stderr.on('data', function(it){
        return out.push(it.toString());
      });
      if (input) {
        proc.stdin.end(input);
      }
      proc.on('error', rej);
      return proc.on('exit', function(code){
        if (code === 0) {
          return res(out.join(''));
        } else {
          return rej(new Error("Command failed: " + cmd.join(' ') + "\noutput:\n" + out.join('')));
        }
      });
    });
  };
  validateRemote = function(b){
    if (!/^[-.0-9a-zA-Z\/]+$/.exec(b)) {
      throw new Error("invalid remote " + b);
    } else {
      return b;
    }
  };
  validateBranch = function(b){
    if (!/^[-.0-9a-zA-Z\/]+$/.exec(b)) {
      throw new Error("invalid branch " + b);
    } else {
      return b;
    }
  };
  validateVersion = function(v){
    if (!(v && /^\d+\.\d+\.\d+$/.exec(v))) {
      throw new Error("invalid version " + v);
    } else {
      return v;
    }
  };
  getVersion = function(){
    return validateVersion((JSON.parse(fs.readFileSync("package.json").toString()) || {}).version);
  };
  parseChangelog = function(arg$){
    var version, filename, ref$, lines, log, hit, start, end, i$, len$, line, to$, i;
    version = arg$.version, filename = (ref$ = arg$.filename) != null ? ref$ : "CHANGELOG.md";
    validateVersion(version);
    if (!fs.existsSync(filename)) {
      return "release for version " + version;
    }
    lines = fs.readFileSync(filename).toString().split('\n');
    ref$ = [[], false, 0, -1], log = ref$[0], hit = ref$[1], start = ref$[2], end = ref$[3];
    for (i$ = 0, len$ = lines.length; i$ < len$; ++i$) {
      line = lines[i$];
      if (!hit && ~line.indexOf(version)) {
        hit = true;
        continue;
      } else if (hit === true && /#+\s+v?\d+\.\d+\.\d+/.exec(line)) {
        hit = false;
        break;
      } else if (hit) {
        log.push(line);
      }
    }
    log = log.map(function(it){
      return it.trim();
    });
    for (i$ = 0, to$ = log.length; i$ < to$; ++i$) {
      i = i$;
      if (!log[i]) {
        continue;
      } else {
        start = i;
        break;
      }
    }
    for (i$ = log.length - 1; i$ >= 0; --i$) {
      i = i$;
      if (!log[i]) {
        continue;
      } else {
        end = i + 1;
        break;
      }
    }
    return log.slice(start, end).join('\n').trim();
  };
  makeRelease = function(arg$){
    var branch, ref$, version, releaseNote, cmd;
    branch = (ref$ = (arg$ != null
      ? arg$
      : {}).branch) != null ? ref$ : "release";
    validateBranch(branch);
    version = getVersion();
    releaseNote = parseChangelog({
      version: version
    });
    if (!releaseNote) {
      console.log(("no available release note for version " + version + " from CHANGELOG.md.").yellow);
      console.log("Generate from commits instead.".yellow);
    }
    releaseNote = releaseNote.replace(/"/gm, '\\"');
    cmd = ['gh', 'release', 'create'].concat(["v" + version], ["--target", branch, "--title", version], !releaseNote
      ? ["--generate-notes"]
      : ["--notes-file", "-"]);
    return exec({
      cmd: cmd,
      input: releaseNote
    });
  };
  isGitWorkTree = function(){
    return exec(['git', 'rev-parse', '--is-inside-work-tree']).then(function(ret){
      ret == null && (ret = "");
      if (ret.trim() !== 'true') {
        return Promise.reject(new Error("not a git repository"));
      }
    });
  };
  ensureReleaseBranch = function(arg$){
    var ref$, remote, ref1$, branch;
    ref$ = arg$ != null
      ? arg$
      : {}, remote = (ref1$ = ref$.remote) != null ? ref1$ : "origin", branch = (ref1$ = ref$.branch) != null ? ref1$ : "release";
    validateBranch(branch);
    validateRemote(remote);
    return isGitWorkTree().then(function(){
      return exec(['git', 'rev-parse', '--abbrev-ref', 'HEAD']).then(function(workingBranch){
        workingBranch = workingBranch.trim();
        return Promise.resolve().then(function(){
          return exec(['git', 'show-ref', '--verify', '--quiet'].concat(["refs/heads/" + branch]));
        })['catch'](function(){
          console.log(("no branch " + branch + " for releasing. creating one from current branch...").yellow);
          return exec(['git', 'checkout', '-b'].concat([branch])).then(function(){
            return exec(['git', 'checkout'].concat([workingBranch])).then(function(){});
          });
        }).then(function(){
          return exec(['git', 'ls-remote', '--heads'].concat([remote, branch])).then(function(ret){
            ret == null && (ret = "");
            if (!!~ret.indexOf("refs/heads/" + branch)) {
              return;
            }
            console.log(("no remote branch " + branch + " for releasing. creating one from current branch...").yellow);
            return exec(['git', 'checkout'].concat([branch])).then(function(){
              return exec(['git', 'push', '--force'].concat([remote, branch])).then(function(){
                return exec(['git', 'checkout'].concat([workingBranch])).then(function(){});
              });
            });
          });
        });
      });
    });
  };
  updateReleaseBranch = function(arg$){
    var ref$, remote, ref1$, branch, workFolder, releaseFolder;
    ref$ = arg$ != null
      ? arg$
      : {}, remote = (ref1$ = ref$.remote) != null ? ref1$ : "origin", branch = (ref1$ = ref$.branch) != null ? ref1$ : "release", workFolder = (ref1$ = ref$.workFolder) != null ? ref1$ : ".fedep/publish";
    releaseFolder = ".fedep/_public";
    validateRemote(remote);
    validateBranch(branch);
    if (!fs.existsSync(workFolder)) {
      return Promise.reject("work folder " + workFolder + " doesn't exist");
    }
    if (fs.existsSync(releaseFolder)) {
      fsExtra.removeSync(releaseFolder);
    }
    return exec(['git', 'worktree', 'add', '--force'].concat([releaseFolder, branch])).then(function(){
      return new Promise(function(res, rej){
        return child_process.exec("cd " + releaseFolder + " && git rm -r *", function(e, sout, serr){
          var cmd;
          serr == null && (serr = "");
          if (e) {
            return rej(new Error([sout, serr].map(function(it){
              return (it || '').trim();
            }).filter(function(it){
              return it;
            }).join('\n')));
          }
          fsExtra.copySync(workFolder, releaseFolder, {
            overwrite: true
          });
          cmd = "cd " + releaseFolder + " && git add * && git commit -m \"regen\" && git push -u " + remote + " " + branch + " && cd .. && rm -rf _public";
          return child_process.exec(cmd, function(e, sout, serr){
            serr == null && (serr = "");
            if (e) {
              return rej(new Error([sout, serr].map(function(it){
                return (it || '').trim();
              }).filter(function(it){
                return it;
              }).join('\n')));
            }
            return res();
          });
        });
      });
    });
  };
  ghStatus = function(){
    return exec(['gh', 'status'])['catch'](function(){
      return Promise.reject(new Error("gh status failed. run 'gh auth login' if necessary."));
    });
  };
  version = getVersion();
  ret = parseChangelog({
    version: version
  });
  console.log("release " + version + " with change log: ");
  console.log("----------------------------------");
  console.log(ret);
  console.log("----------------------------------");
  return Promise.resolve().then(function(){
    console.log("[release] check gh status ...".yellow);
    return ghStatus();
  }).then(function(){
    console.log("[release] check work tree status ...".yellow);
    return isGitWorkTree();
  }).then(function(){
    console.log("[release] prepare release branch...".yellow);
    return ensureReleaseBranch({
      branch: branch
    });
  }).then(function(){
    console.log("[release] update release branch...".yellow);
    return updateReleaseBranch({
      branch: branch
    });
  }).then(function(){
    console.log("[release] make github release ...".yellow);
    return makeRelease({
      branch: branch
    });
  }).then(function(){
    return console.log("[release] finish. ".green);
  })['catch'](function(e){
    return console.log("[release] failed: ".red, e);
  });
};
cmds.publish = {
  command: 'publish',
  desc: 'publish module to npm with specified folder content in root folder',
  builder: function(yargs){
    return yargs.option('dup', {
      type: 'boolean',
      'default': false,
      alias: 'd',
      description: "copy instead move when true. default false"
    }).option('folder', {
      type: 'string',
      'default': 'dist',
      alias: 'f',
      description: "default folder to publish"
    }).option('github', {
      type: 'string',
      alias: 'g',
      description: "publish into branch"
    });
  },
  handler: function(argv){
    var srcFolder, workFolder, releaseBranch, packageJson, json, files, re, exec, p;
    srcFolder = argv.f || "dist";
    workFolder = ".fedep/publish";
    releaseBranch = !(argv.g != null)
      ? ''
      : !argv.g
        ? 'release'
        : argv.g;
    if (releaseBranch && !/^[.0-9a-zA-Z/]+$/.exec(releaseBranch)) {
      console.error(("[ERROR] invalid specified release branch name " + releaseBranch + ". exit.").red);
      process.exit();
    }
    if (fs.existsSync(workFolder)) {
      fsExtra.removeSync(workFolder);
    }
    if (!fs.existsSync(srcFolder)) {
      console.error("[ERROR] specified publish folder `".red + srcFolder.brightYellow + "` doesn't exist. exit.".red);
      process.exit();
    }
    fsExtra.ensureDirSync(workFolder);
    fsExtra.copySync(srcFolder, workFolder);
    ['README', 'README.md', 'package.json', 'LICENSE', 'CHANGELOG.md'].map(function(it){
      if (!fs.existsSync(it)) {
        return;
      }
      return fsExtra.copySync(it, path.join(workFolder, it));
    });
    packageJson = path.join(workFolder, "package.json");
    json = JSON.parse(fs.readFileSync(packageJson).toString());
    files = (json.files || []).map(function(item){
      var ret;
      return ret = glob.sync(item);
    }).reduce(function(a, b){
      return a.concat(b);
    }, []);
    if (!argv.d) {
      re = new RegExp("^" + srcFolder);
      files = files.filter(function(it){
        return !re.exec(it);
      });
    }
    files.map(function(f){
      var des;
      des = path.join(workFolder, f);
      fsExtra.ensureDirSync(path.dirname(des));
      console.log(" --", "[COPY]".green, f + " -> " + des);
      return fsExtra.copySync(f, des);
    });
    ['style', 'module', 'main', 'browser', 'unpkg'].map(function(field){
      if (!json[field]) {
        return;
      }
      return json[field] = path.relative(srcFolder, json[field]);
    });
    delete json.files;
    fs.writeFileSync(packageJson, JSON.stringify(json));
    exec = function(cmd){
      return new Promise(function(res, rej){
        var proc;
        proc = child_process.spawn(cmd[0], cmd.slice(1), {
          stdio: 'inherit'
        });
        return proc.on('exit', function(it){
          if (it > 0) {
            return rej(new Error());
          } else {
            return res();
          }
        });
      });
    };
    p = !releaseBranch
      ? exec(['npm', 'publish'].concat([workFolder], ['--access', 'public']))
      : makeGithubRelease({
        branch: releaseBranch || 'release'
      });
    return p.then(function(){
      return fs.rmSync(workFolder, {
        recursive: true,
        force: true
      });
    });
  }
};
cmds.license = {
  command: 'license',
  desc: 'generate or update LICENSE file',
  builder: function(yargs){
    return yargs.positional('type', {
      describe: 'license type, e.g., mit, apache, bsd, agpl',
      type: 'string'
    });
  },
  handler: function(argv){
    var pkg, e, type, templates, name;
    pkg = (function(){
      try {
        return JSON.parse(fs.readFileSync('package.json').toString());
      } catch (e$) {
        e = e$;
        return quit("[ERROR] Cannot find or parse package.json.".red);
      }
    }());
    type = pkg.license || argv._[1] || argv.type;
    if (!type) {
      quit("[ERROR] No license type specified.".red);
    }
    type = type.toLowerCase();
    templates = {
      isc: 'ISC License\n\nCopyright (c) #{year} #{name}\n\nPermission to use, copy, modify, and/or distribute this software for any\npurpose with or without fee is hereby granted, provided that the above\ncopyright notice and this permission notice appear in all copies.\n\nTHE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES\nWITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF\nMERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR\nANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES\nWHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN\nACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF\nOR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.',
      mit: 'MIT License\n\nCopyright (c) #{year} #{name}\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.',
      apache: 'Apache License\nVersion 2.0, January 2004\nhttp://www.apache.org/licenses/\n\nCopyright (c) #{year} #{name}\n\nLicensed under the Apache License, Version 2.0 (the "License");\nyou may not use this file except in compliance with the License.\nYou may obtain a copy of the License at\n\n    http://www.apache.org/licenses/LICENSE-2.0\n\nUnless required by applicable law or agreed to in writing, software\ndistributed under the License is distributed on an "AS IS" BASIS,\nWITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\nSee the License for the specific language governing permissions and\nlimitations under the License.',
      bsd: 'BSD 3-Clause License\n\nCopyright (c) #{year}, #{name}\nAll rights reserved.\n\nRedistribution and use in source and binary forms, with or without\nmodification, are permitted provided that the following conditions are met:\n\n* Redistributions of source code must retain the above copyright notice, this\n  list of conditions and the following disclaimer.\n\n* Redistributions in binary form must reproduce the above copyright notice,\n  this list of conditions and the following disclaimer in the documentation\n  and/or other materials provided with the distribution.\n\n* Neither the name of #{name} nor the names of its contributors may be used\n  to endorse or promote products derived from this software without specific\n  prior written permission.\n\nTHIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"\nAND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE\nIMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE\nDISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE\nFOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL\nDAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR\nSERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER\nCAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,\nOR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE\nOF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.',
      agpl: 'GNU AFFERO GENERAL PUBLIC LICENSE\nVersion 3, 19 November 2007\n\nCopyright (C) #{year} #{name}\n\nThis program is free software: you can redistribute it and/or modify\nit under the terms of the GNU Affero General Public License as published by\nthe Free Software Foundation, either version 3 of the License, or\n(at your option) any later version.\n\nThis program is distributed in the hope that it will be useful,\nbut WITHOUT ANY WARRANTY; without even the implied warranty of\nMERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the\nGNU Affero General Public License for more details.\n\nYou should have received a copy of the GNU Affero General Public License\nalong with this program.  If not, see <https://www.gnu.org/licenses/>.'
    };
    if (!templates[type]) {
      quit(("[ERROR] Unsupported license type: " + type).red);
    }
    name = typeof pkg.author === 'string'
      ? pkg.author
      : typeof pkg.author === 'object' ? pkg.author.name : null;
    return Promise.resolve().then(function(){
      if (name) {
        return name;
      }
      return getInput("Author name not found. Please enter your name for LICENSE: ");
    }).then(function(name){
      var cmd, years, sy, ey, year, e, license;
      if (!name) {
        quit("[ERROR] No author name provided. Cannot generate LICENSE.".red);
      }
      try {
        cmd = 'git log --reverse --format=%ad --date=format:%Y';
        years = child_process.execSync(cmd).toString().trim().split('\n').filter(function(it){
          return it;
        });
        sy = (years[0] || '').trim();
        ey = (years[years.length - 1] || '').trim();
        year = !ey || sy === ey
          ? sy
          : sy + "-" + ey;
        if (!year) {
          throw new Error("no year");
        }
      } catch (e$) {
        e = e$;
        year = new Date().getFullYear() + "";
      }
      license = templates[type].replace(/#{year}/g, year).replace(/#{name}/g, name);
      fs.writeFileSync("LICENSE", license.trim() + "\n");
      return console.log(("LICENSE (" + type.toUpperCase() + ") generated.").green);
    });
  }
};
arg = yargs;
for (k in cmds) {
  v = cmds[k];
  arg = arg.command(v);
}
arg.argv;
function import$(obj, src){
  var own = {}.hasOwnProperty;
  for (var key in src) if (own.call(src, key)) obj[key] = src[key];
  return obj;
}
