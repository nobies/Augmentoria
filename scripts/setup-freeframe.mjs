import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const serviceDir = resolve('services/freeframe')
const composeFile = resolve(serviceDir, 'docker-compose.dev.yml')
const target = resolve(serviceDir, '.env')
const template = resolve('config/freeframe.dev.env')

if (!existsSync(composeFile)) {
  throw new Error('FreeFrame submodule is missing. Run: git submodule update --init --recursive')
}

if (!existsSync(target)) {
  copyFileSync(template, target)
  console.log('Created services/freeframe/.env from the tracked local-development template.')
}
