/**
 * Prepares a clean, flat node_modules for electron-builder.
 *
 * Traces all transitive deps from the Electron entry packages,
 * flattens nested node_modules, and writes the result to
 * node_modules_electron/. The build.files config points here.
 *
 * Usage: node scripts/prepare-electron-deps.js
 */
const fs = require('node:fs');
const path = require('node:path');
const builtins = new Set(require('node:module').builtinModules);

const ENTRY_DEPS = [
  '@sentry/electron',
  'electron-store',
  'electron-log',
  'electron-updater',
  'electron-window-state',
  'electron-context-menu',
  'discord-rpc',
];

const projectRoot = process.cwd();

function resolvePkg(name, fromDir) {
  // First try: resolve the package's main entry point and find the nearest package.json
  try {
    const resolved = require.resolve(name, { paths: [fromDir] });
    let dir = path.dirname(resolved);
    while (dir && dir !== '/' && dir !== projectRoot) {
      const pkgPath = path.join(dir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkgJson.name === name) return dir;
      }
      dir = path.dirname(dir);
    }
  } catch {}

  // Second try: resolve package.json directly
  try {
    const pkgJson = require.resolve(`${name}/package.json`, {
      paths: [fromDir],
    });
    return path.dirname(pkgJson);
  } catch {}

  // Fallback: nested node_modules, then top-level
  const nested = path.join(fromDir, 'node_modules', name);
  if (fs.existsSync(nested)) return fs.realpathSync(nested);
  const topLevel = path.join(projectRoot, 'node_modules', name);
  if (fs.existsSync(topLevel)) return fs.realpathSync(topLevel);

  // If it's a pnpm workspace, the package might be hoisted to the root of the .pnpm store
  return null;
}

function collectDeps(pkgDir, collected) {
  let pkgJson;
  try {
    pkgJson = JSON.parse(
      fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'),
    );
  } catch {
    return;
  }

  for (const dep of Object.keys(pkgJson.dependencies || {})) {
    if (builtins.has(dep) || dep.startsWith('node:') || dep === 'electron')
      continue;
    if (collected.has(dep)) continue;

    const resolved = resolvePkg(dep, pkgDir);

    if (resolved) {
      collected.set(dep, resolved);
      collectDeps(resolved, collected);
    }
  }
}

// Collect all deps
const collected = new Map();
for (const dep of ENTRY_DEPS) {
  const depDir = resolvePkg(dep, projectRoot);
  if (depDir) {
    collected.set(dep, depDir);
    collectDeps(depDir, collected);
  }
}

// Write flat node_modules
const outDir = path.join(projectRoot, 'node_modules_electron');
if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true });

for (const [name, srcDir] of collected) {
  const destDir = path.join(outDir, name);
  fs.cpSync(srcDir, destDir, { recursive: true });
}

// --- GENERATE DUMMY PACKAGES FOR OPTIONAL SENTRY NODE INTEGRATIONS ---
// @sentry/node@10 statically requires many server-side integrations (Prisma, Fastify, Hapi, etc.)
// Because these are not in a try/catch, if the package is missing, the Electron main process crashes.
// We don't want to bundle megabytes of server code in a desktop app, so we generate tiny dummy packages
// that just export an empty object. This satisfies the require() without the bloat.
const dummyPackages = [
  '@prisma/instrumentation',
  '@fastify/otel',
  '@hapi/hapi',
  'graphql',
  'express',
  'pg',
  'mysql2',
  'amqplib',
  'dataloader',
  'ioredis',
  'kafkajs',
  'koa',
  'mongodb',
  'mongoose',
  'mysql',
  'redis',
  'tedious',
  'undici',
  'lru-memoizer',
];

for (const pkg of dummyPackages) {
  const pkgDir = path.join(outDir, pkg);
  if (!fs.existsSync(pkgDir)) {
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({ name: pkg, version: '1.0.0', main: 'index.js' }),
    );
    fs.writeFileSync(path.join(pkgDir, 'index.js'), 'module.exports = {};\n');
  }
}

console.log(
  `Prepared ${collected.size} real packages and ${dummyPackages.length} dummy packages in node_modules_electron/`,
);
