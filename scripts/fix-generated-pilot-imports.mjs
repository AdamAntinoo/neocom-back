import { readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = 'src/generated/pilot'

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(full)))
    else if (entry.name.endsWith('.ts')) files.push(full)
  }
  return files
}

const generatedPackage = path.join(root, 'package.json')
const packageJson = JSON.parse(await readFile(generatedPackage, 'utf8'))
packageJson.type = 'module'
await writeFile(generatedPackage, `${JSON.stringify(packageJson, null, 2)}\n`)
await rm(path.join(root, 'tsconfig.json'), { force: true })
await rm(path.join(root, 'tsconfig.build.json'), { force: true })
await rm(path.join(root, 'api'), { recursive: true, force: true })
await rm(path.join(root, 'api.module.ts'), { force: true })
await rm(path.join(root, 'git_push.sh'), { force: true })
await writeFile(path.join(root, 'index.ts'), "export * from './model/models.js';\n")

for (const file of await walk(root)) {
  const text = await readFile(file, 'utf8')
  const next = text
    .replaceAll("from '@nestjs/common/interfaces'", "from '@nestjs/common'")
    .replaceAll(/from (['"])(\.\.?\/[^'"]+?)\1/g, (match, quote, spec) =>
      spec.endsWith('.js') ? match : `from ${quote}${spec}.js${quote}`,
    )
  if (next !== text) await writeFile(file, next)
}
