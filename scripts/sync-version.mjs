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

function upsertVersionFile(relativePath, nextVersion) {
  const filePath = path.join(root, relativePath);
  let before = '';
  try {
    before = readFileSync(filePath, 'utf8');
  } catch {
    writeFileSync(filePath, `VERSION=${nextVersion}\n`, 'utf8');
    console.log(`Created ${relativePath}`);
    return;
  }
  if (/^VERSION=.*/m.test(before)) {
    writeFileSync(filePath, before.replace(/^VERSION=.*/m, `VERSION=${nextVersion}`), 'utf8');
  } else {
    const prefix = before.length > 0 && !before.endsWith('\n') ? '\n' : '';
    writeFileSync(filePath, `${before}${prefix}VERSION=${nextVersion}\n`, 'utf8');
  }
  console.log(`Updated ${relativePath}`);
}

upsertVersionFile('.env.version', version);

execFileSync(process.execPath, [path.join(root, 'scripts/generate-banner.mjs')], {
  cwd: root,
  stdio: 'inherit',
});

console.log(`version:sync → ${version}`);
