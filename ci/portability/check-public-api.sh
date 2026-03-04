#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "$ROOT_DIR"

node --input-type=module <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const rootDir = process.cwd();
const packagesDir = path.join(rootDir, 'packages');
const packageDirs = fs
  .readdirSync(packagesDir)
  .map((name) => path.join(packagesDir, name))
  .filter((dir) => fs.statSync(dir).isDirectory());

const failures = [];

function collectExportTargets(value, out = []) {
  if (typeof value === 'string') {
    out.push({ condition: null, target: value });
    return out;
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      if (typeof nested === 'string') {
        out.push({ condition: key, target: nested });
      } else {
        collectExportTargets(nested, out);
      }
    }
  }
  return out;
}

function shouldLoadRuntimeTarget(condition, target) {
  if (condition === 'types' || target.endsWith('.d.ts')) {
    return false;
  }
  return target.endsWith('.js') || target.endsWith('.mjs') || target.endsWith('.cjs');
}

for (const pkgDir of packageDirs) {
  const pkgJsonPath = path.join(pkgDir, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) {
    continue;
  }

  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  const pkgName = pkgJson.name;

  if (!pkgName || !pkgJson.exports) {
    continue;
  }

  for (const [exportKey, exportValue] of Object.entries(pkgJson.exports)) {
    const targets = collectExportTargets(exportValue);
    for (const { condition, target } of targets) {
      if (!target.startsWith('./dist/')) {
        failures.push(`${pkgName} export ${exportKey} target must point to dist: ${target}`);
        continue;
      }
      const absoluteTarget = path.join(pkgDir, target);
      if (!fs.existsSync(absoluteTarget)) {
        failures.push(`${pkgName} export ${exportKey} target does not exist: ${target}`);
        continue;
      }

      if (shouldLoadRuntimeTarget(condition, target)) {
        try {
          await import(pathToFileURL(absoluteTarget).href);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          failures.push(`${pkgName} export ${exportKey} runtime target is not importable: ${target} (${message})`);
        }
      }
    }
  }

  if (pkgJson.bin && typeof pkgJson.bin === 'object') {
    for (const [binName, binPath] of Object.entries(pkgJson.bin)) {
      if (typeof binPath !== 'string' || !binPath.startsWith('./dist/')) {
        failures.push(`${pkgName} bin ${binName} must point to dist: ${String(binPath)}`);
        continue;
      }
      const absoluteBinPath = path.join(pkgDir, binPath);
      if (!fs.existsSync(absoluteBinPath)) {
        failures.push(`${pkgName} bin ${binName} target does not exist: ${binPath}`);
        continue;
      }
    }
  }
}

if (failures.length > 0) {
  console.error('Public API portability check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Public API portability check passed.');
NODE
