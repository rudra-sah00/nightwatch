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
  'electron-asar-hot-updater',
  'electron-window-state',
  'electron-context-menu',
  'discord-rpc',
];

const projectRoot = process.cwd();

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

    // Resolve: nested first, then top-level
    const nested = path.join(pkgDir, 'node_modules', dep);
    const topLevel = path.join(projectRoot, 'node_modules', dep);
    const resolved = fs.existsSync(nested)
      ? nested
      : fs.existsSync(topLevel)
        ? topLevel
        : null;

    if (resolved) {
      collected.set(dep, resolved);
      collectDeps(resolved, collected);
    }
  }
}

// Collect all deps
const collected = new Map();
for (const dep of ENTRY_DEPS) {
  const depDir = path.join(projectRoot, 'node_modules', dep);
  if (fs.existsSync(depDir)) {
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

console.log(`Prepared ${collected.size} packages in node_modules_electron/`);
