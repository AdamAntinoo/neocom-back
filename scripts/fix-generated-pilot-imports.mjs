import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = 'src/infrastructure/generated/pilot'

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

for (const file of await walk(root)) {
  const text = await readFile(file, 'utf8')
  const next = text
    .replaceAll("from '@nestjs/common/interfaces'", "from '@nestjs/common'")
    .replaceAll(/from (['"])(\.\.?\/[^'"]+?)\1/g, (match, quote, spec) =>
      spec.endsWith('.js') ? match : `from ${quote}${spec}.js${quote}`,
    )
  if (next !== text) await writeFile(file, next)
}
