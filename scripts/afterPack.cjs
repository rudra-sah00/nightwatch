const {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} = require('node:fs');
const { join, extname } = require('node:path');
const { obfuscate } = require('javascript-obfuscator');

const OBFUSCATION_OPTIONS = {
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  stringArray: true,
  stringArrayThreshold: 0.5,
  stringArrayEncoding: ['base64'],
  selfDefending: false,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  target: 'node',
};

function walkDir(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkDir(full, files);
    else if (extname(full) === '.js') files.push(full);
  }
  return files;
}

exports.default = async function afterPack(context) {
  const { existsSync, unlinkSync, rmSync } = require('node:fs');
  const asar = require('@electron/asar');

  // Resolve the correct resources path per platform
  let resourcesDir;
  if (context.packager.platform.name === 'mac') {
    const appName = context.packager.appInfo.productFilename;
    resourcesDir = join(
      context.appOutDir,
      `${appName}.app`,
      'Contents',
      'Resources',
    );
  } else {
    resourcesDir = join(context.appOutDir, 'resources');
  }

  const asarPath = join(resourcesDir, 'app.asar');
  const appDir = join(resourcesDir, 'app');
  const electronDir = join(appDir, 'electron');

  // If ASAR exists, extract → obfuscate → repack
  if (existsSync(asarPath)) {
    const tmpDir = join(context.appOutDir, '_obfuscate_tmp');
    asar.extractAll(asarPath, tmpDir);

    const files = walkDir(join(tmpDir, 'electron'));
    let count = 0;
    for (const file of files) {
      const code = readFileSync(file, 'utf8');
      const result = obfuscate(code, OBFUSCATION_OPTIONS);
      writeFileSync(file, result.getObfuscatedCode());
      count++;
    }

    unlinkSync(asarPath);
    await asar.createPackage(tmpDir, asarPath);
    rmSync(tmpDir, { recursive: true });
    console.log(`✅ Obfuscated ${count} Electron JS files (ASAR repacked)`);
    return;
  }

  // Pre-ASAR: files are in app/electron/
  if (existsSync(electronDir)) {
    const files = walkDir(electronDir);
    let count = 0;
    for (const file of files) {
      const code = readFileSync(file, 'utf8');
      const result = obfuscate(code, OBFUSCATION_OPTIONS);
      writeFileSync(file, result.getObfuscatedCode());
      count++;
    }
    console.log(`✅ Obfuscated ${count} Electron JS files`);
    return;
  }

  console.warn('⚠️ Obfuscation skipped: could not locate electron files');
};
