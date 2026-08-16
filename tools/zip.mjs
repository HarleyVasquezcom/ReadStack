import archiver from 'archiver';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SLUG = path.basename(ROOT);
const FILES = [
  'manifest.json',
  'i18n.js',
  'popup.html',
  'popup.css',
  'popup.js',
  'icons',
  'README.md',
];
const FIXED_DATE = new Date('2026-08-16T00:00:00Z');
const OUT = path.join(ROOT, 'dist', SLUG + '.zip');
const LANDING = path.join(ROOT, 'landing', SLUG + '.zip');

fs.mkdirSync(path.dirname(OUT), { recursive: true });

const archive = archiver('zip', { zlib: { level: 9 } });
const stream = fs.createWriteStream(OUT);
archive.pipe(stream);

for (const entry of FILES) {
  const abs = path.join(ROOT, entry);
  const stat = fs.statSync(abs);
  if (stat.isDirectory()) {
    const name = path.basename(entry);
    archive.glob('**/*', { cwd: abs, dot: false }, { name: name + '/', date: FIXED_DATE, prefix: name + '/' });
  } else {
    archive.file(abs, { name: entry, date: FIXED_DATE });
  }
}

await archive.finalize();
await new Promise((resolve, reject) => {
  stream.on('close', resolve);
  stream.on('error', reject);
});

fs.mkdirSync(path.dirname(LANDING), { recursive: true });
fs.copyFileSync(OUT, LANDING);
console.log('zip: ' + OUT + ' (' + fs.statSync(OUT).size + ' bytes)');
console.log('landing copy: ' + LANDING);