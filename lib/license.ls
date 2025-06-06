cmds.license =
  command: \license
  desc: 'generate or update LICENSE file'
  builder: (yargs) ->
    yargs
      .positional \type, do
        describe: 'license type, e.g., mit, apache, bsd, agpl'
        type: \string
  handler: (argv) ->
    # 讀取 package.json 拿作者
    pkg =
      try
        JSON.parse(fs.read-file-sync('package.json').toString!)
      catch
        quit "[ERROR] Cannot find or parse package.json.".red

    type = pkg.license or argv._[1] or argv.type
    unless type
      quit "[ERROR] No license type specified.".red

    type = type.toLowerCase!

    templates =
      isc: '''
      ISC License

      Copyright (c) #{year} #{name}

      Permission to use, copy, modify, and/or distribute this software for any
      purpose with or without fee is hereby granted, provided that the above
      copyright notice and this permission notice appear in all copies.

      THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
      WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
      MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
      ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
      WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
      ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
      OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
      '''
      mit: '''
      MIT License

      Copyright (c) #{year} #{name}

      Permission is hereby granted, free of charge, to any person obtaining a copy
      of this software and associated documentation files (the "Software"), to deal
      in the Software without restriction, including without limitation the rights
      to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
      copies of the Software, and to permit persons to whom the Software is
      furnished to do so, subject to the following conditions:

      The above copyright notice and this permission notice shall be included in all
      copies or substantial portions of the Software.

      THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
      IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
      FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
      AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
      LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
      OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
      SOFTWARE.
      '''
      apache: '''
      Apache License
      Version 2.0, January 2004
      http://www.apache.org/licenses/

      Copyright (c) #{year} #{name}

      Licensed under the Apache License, Version 2.0 (the "License");
      you may not use this file except in compliance with the License.
      You may obtain a copy of the License at

          http://www.apache.org/licenses/LICENSE-2.0

      Unless required by applicable law or agreed to in writing, software
      distributed under the License is distributed on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
      See the License for the specific language governing permissions and
      limitations under the License.
      '''
      bsd: '''
      BSD 3-Clause License

      Copyright (c) #{year}, #{name}
      All rights reserved.

      Redistribution and use in source and binary forms, with or without
      modification, are permitted provided that the following conditions are met:

      * Redistributions of source code must retain the above copyright notice, this
        list of conditions and the following disclaimer.

      * Redistributions in binary form must reproduce the above copyright notice,
        this list of conditions and the following disclaimer in the documentation
        and/or other materials provided with the distribution.

      * Neither the name of #{name} nor the names of its contributors may be used
        to endorse or promote products derived from this software without specific
        prior written permission.

      THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
      AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
      IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
      DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
      FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
      DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
      SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
      CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
      OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
      OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
      '''
      agpl: '''
      GNU AFFERO GENERAL PUBLIC LICENSE
      Version 3, 19 November 2007

      Copyright (C) #{year} #{name}

      This program is free software: you can redistribute it and/or modify
      it under the terms of the GNU Affero General Public License as published by
      the Free Software Foundation, either version 3 of the License, or
      (at your option) any later version.

      This program is distributed in the hope that it will be useful,
      but WITHOUT ANY WARRANTY; without even the implied warranty of
      MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
      GNU Affero General Public License for more details.

      You should have received a copy of the GNU Affero General Public License
      along with this program.  If not, see <https://www.gnu.org/licenses/>.
      '''

    unless templates[type]
      quit "[ERROR] Unsupported license type: #{type}".red

    name =
      if typeof(pkg.author) == \string => pkg.author
      else if typeof(pkg.author) == \object => pkg.author.name
      else null

    Promise.resolve!
      .then ->
        if name => return name
        get-input "Author name not found. Please enter your name for LICENSE: "
      .then (name) ->
        unless name
          quit "[ERROR] No author name provided. Cannot generate LICENSE.".red

        try
          cmd = 'git log --reverse --format=%ad --date=format:%Y'
          years = child_process.execSync(cmd).toString!trim!split('\n')filter(->it)
          sy = (years.0 or '').trim!
          ey = (years[* - 1] or '').trim!
          year = if !ey or sy == ey => sy else "#{sy}-#{ey}"
          if !year => throw new Error("no year")
        catch e =>
          year = "#{new Date! .getFullYear!}"

        license = templates[type]
          .replace(/#{year}/g, year)
          .replace(/#{name}/g, name)
        fs.write-file-sync "LICENSE", license.trim! + "\n"
        console.log "LICENSE (#{type.toUpperCase!}) generated.".green


