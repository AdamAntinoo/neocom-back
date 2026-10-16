import figlet from 'figlet';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version ?? '0.0.0';

const banner = `${figlet.textSync(`Neocom ${version}`, { horizontalLayout: 'default' })}\n`;

const outPath = path.join(root, '.app-banner.txt');
writeFileSync(outPath, banner, 'utf8');
console.log(`Wrote ${outPath}`);
