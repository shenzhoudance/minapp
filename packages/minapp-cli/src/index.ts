#!/usr/bin/env node

import {error, clog} from 'mora-scripts/libs/sys/'
import * as cli from 'mora-scripts/libs/tty/cli'
import {EOL} from 'os'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as inquirer from 'inquirer'
const validateProjectName = require('validate-npm-package-name')
const pkg = require('../package.json')

import {Compiler} from '@minapp/compiler'
import {getGitUser} from './helper'
import {make} from './make'

require('update-notifier')({pkg}).notify()

const version = pkg.version

let commonOpts = {
  srcDir: '<string> specify code source directory    {{"src"}}',
  distDir: '<string> specify build files directory   {{"dist"}}',
}

cli({
  usage: 'minapp <command> [options]',
  version
}).commands({
  init: {
    desc: 'init a project',
    conf: { usage: 'cli init <folder>' },
    cmd: res => initProject(res._)
  },
  dev: {
    desc: 'develop a preject, will inject a global variable: __ENV__="development"',
    conf: {version},
    options: {
      ...commonOpts,
      'host': '<string> server host {{"localhost"}}',
      'port': '<string> server port {{"8080"}}',
      'm | minimize': '<boolean> minimize source files',
    },
    cmd: res => compile('dev', res)
  },
  build: {
    desc: 'build a project, will inject a global variable: __ENV__="production"',
    conf: {version},
    options: {
      ...commonOpts,
      'p | publicPath': '<string> static file\'s publicPath, just like `output.publicPath` in webpack',
      'w | watch': '<boolean> watch mode, without webpack-dev-server',
    },
    cmd: res => compile('build', res)
  }
}).parse((res, self) => self.help())


/**
 * 初始化一个项目
 */
function initProject(folders: string[]) {
  if (folders.length === 0) return error('Please specify the initial project directory')
  if (folders.length > 1) return error('You can only specify one project directory')
  let dir = folders[0]
  let absDir = path.resolve(dir)

  if (fs.existsSync(dir) && !fs.statSync(dir).isDirectory()) return error(`Target "${dir}" not a valid directory`)

  fs.ensureDirSync(dir)
  if (fs.readdirSync(dir).length) return error(`Directory "${dir}" already has files in it, please use an empty directory or not exist directory`)

  inquirer.prompt([
    {
      type: 'list',
      name: 'language',
      message: 'Project language',
      choices: ['TypeScript', 'JavaScript'],
      default: 0
    },
    {
      type: 'input',
      name: 'name',
      message: 'Project name',
      default: path.basename(absDir),
      validate: (answer) => {
        let result = validateProjectName(answer)
        if (result.validForNewPackages) return true
        let message = [...(result.warnings || []), ...(result.errors || [])]
        return message.join('; ')
      }
    },
    {
      type: 'input',
      name: 'description',
      message: 'Project description',
      default: 'A wonderful miniapp project'
    },
    {
      type: 'input',
      name: 'author',
      message: 'Author',
      default: getGitUser()
    },
    {
      type: 'input',
      name: 'appid',
      message: 'Wexin app id'
    }
  ]).then(answers => {
    make(answers.language === 'TypeScript' ? 'ts' : 'js', absDir, answers)

    console.log(
      `${EOL}  ${answers.language} project ${answers.name} initialize successfully${EOL}`
      + `===============================================${EOL}${EOL}`
      + `  You can run next two commands to continue:${EOL}${EOL}`
      + `    ${code('cd ' + dir)}${EOL}`
      + `    ${code('npm install')} or ${code('yarn install')}${EOL}${EOL}${EOL}`
      + `    ${clog.format('%cHave a good time !', 'magenta')} ${EOL}`
    )
  })
}

function code(str: string) {
  return clog.format('%c' + str, 'yellow')
}

function compile(type: string, opts: any) {
  if (type === 'dev') {
    let {host, port, minimize} = opts
    let server: any = {host, port}
    return new Compiler(opts.srcDir, opts.distDir, {server, minimize, production: false})
  } else {
    let {watch, publicPath} = opts
    return new Compiler(opts.srcDir, opts.distDir, {watch, publicPath, production: true})
  }
}

