/**
 * Resolves every npm package the Electron main process needs at runtime,
 * including nested node_modules (e.g. conf/node_modules/dot-prop).
 * Outputs a JSON array of glob patterns for electron-builder's build.files.
 *
 * Usage: node scripts/electron-deps.js
 */
const fs = require('node:fs');
const path = require('node:path');
const builtins = new Set(require('module').builtinModules);

const ELECTRON_ENTRY_DEPS = [
  '@sentry/electron',
  'electron-store',
  'electron-log',
  'electron-updater',
  'electron-asar-hot-updater',
  'electron-window-state',
  'electron-context-menu',
  'discord-rpc',
];

const seen = new Set();

function traceDeps(pkgDir, prefix) {
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

    // Check nested node_modules first, then top-level
    const nestedDir = path.join(pkgDir, 'node_modules', dep);
    const topDir = path.join('node_modules', dep);

    if (fs.existsSync(nestedDir)) {
      const key = path.relative('.', nestedDir);
      if (!seen.has(key)) {
        seen.add(key);
        traceDeps(nestedDir, key);
      }
    } else if (fs.existsSync(topDir)) {
      const key = path.relative('.', topDir);
      if (!seen.has(key)) {
        seen.add(key);
        traceDeps(topDir, key);
      }
    }
  }
}

// Trace from each entry dep
for (const dep of ELECTRON_ENTRY_DEPS) {
  const dir = path.join('node_modules', dep);
  const key = path.relative('.', dir);
  if (!seen.has(key)) {
    seen.add(key);
    traceDeps(dir, key);
  }
}

const patterns = [...seen].sort().map((p) => p + '/**/*');
console.log(JSON.stringify(patterns, null, 2));
