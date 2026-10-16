import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const version = execFileSync('gitversion', ['/nocache', '/showvariable', 'MajorMinorPatch'], {
  cwd: root,
  encoding: 'utf8',
}).trim();

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Expected MajorMinorPatch X.Y.Z, got: ${version}`);
  process.exit(1);
}

execFileSync('npm', ['pkg', 'set', `version=${version}`], { cwd: root, stdio: 'inherit' });

function replaceInFile(relativePath, pattern, replacement) {
  const filePath = path.join(root, relativePath);
  const before = readFileSync(filePath, 'utf8');
  const after = before.replace(pattern, replacement);
  if (after === before) {
    console.error(`No match in ${relativePath} for ${pattern}`);
    process.exit(1);
  }
  writeFileSync(filePath, after, 'utf8');
  console.log(`Updated ${relativePath}`);
}

replaceInFile('.env.version', /^VERSION=.*/m, `VERSION=${version}`);

execFileSync(process.execPath, [path.join(root, 'scripts/generate-banner.mjs')], {
  cwd: root,
  stdio: 'inherit',
});

console.log(`version:sync → ${version}`);
