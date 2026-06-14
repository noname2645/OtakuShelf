#!/usr/bin/env node
/**
 * OtakuShelf — Version bump script
 *
 * Usage (run from  src/):
 *   node scripts/version.js           → shows current version
 *   node scripts/version.js patch     → 1.0.0 → 1.0.1
 *   node scripts/version.js minor     → 1.0.0 → 1.1.0
 *   node scripts/version.js major     → 1.0.0 → 2.0.0
 *   node scripts/version.js 2.3.1     → set explicit version
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Paths ──────────────────────────────────────────────────────────
const VERSION_FILE     = resolve(ROOT, 'VERSION');
const FRONTEND_PKG     = resolve(ROOT, 'Frontend', 'package.json');
const BACKEND_PKG      = resolve(ROOT, 'Backend',  'package.json');

// ── Helpers ────────────────────────────────────────────────────────
const readVersion = () => readFileSync(VERSION_FILE, 'utf8').trim();

const writeVersion = (v) => writeFileSync(VERSION_FILE, v + '\n', 'utf8');

const bumpPkg = (pkgPath, version) => {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.version = version;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
};

const bump = (current, type) => {
  const [maj, min, pat] = current.split('.').map(Number);
  if (type === 'major') return `${maj + 1}.0.0`;
  if (type === 'minor') return `${maj}.${min + 1}.0`;
  if (type === 'patch') return `${maj}.${min}.${pat + 1}`;
  // explicit semver string
  if (/^\d+\.\d+\.\d+$/.test(type)) return type;
  throw new Error(`Unknown bump type: "${type}". Use patch | minor | major | x.y.z`);
};

// ── Main ───────────────────────────────────────────────────────────
const arg = process.argv[2];
const current = readVersion();

if (!arg) {
  console.log(`Current version: ${current}`);
  process.exit(0);
}

const next = bump(current, arg);

writeVersion(next);
bumpPkg(FRONTEND_PKG, next);
bumpPkg(BACKEND_PKG,  next);

console.log(`\n  ✅  OtakuShelf bumped: ${current} → ${next}\n`);
console.log(`     VERSION          updated`);
console.log(`     Frontend/package.json updated`);
console.log(`     Backend/package.json  updated\n`);
