/**
 * afterPack.cjs — runs BEFORE electron-builder signs the app.
 *
 * 1. Obfuscates all electron/ JS files inside the ASAR.
 * 2. Flips Electron security fuses on the native binary.
 *
 * Both steps MUST happen here (before signing) so the code signature
 * covers the final state of the binary and ASAR.
 */
const {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  existsSync,
  unlinkSync,
  rmSync,
} = require('node:fs');
const { join, extname } = require('node:path');
const { obfuscate } = require('javascript-obfuscator');
const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses');
const asar = require('@electron/asar');

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
  const { appOutDir, packager } = context;
  const appName = packager.appInfo.productFilename;

  // --- STEP 1: ASAR OBFUSCATION ---
  let resourcesDir;
  if (packager.platform.name === 'mac') {
    resourcesDir = join(appOutDir, `${appName}.app`, 'Contents', 'Resources');
  } else {
    resourcesDir = join(appOutDir, 'resources');
  }

  const asarPath = join(resourcesDir, 'app.asar');

  if (existsSync(asarPath)) {
    const tmpDir = join(appOutDir, '_obfuscate_tmp');
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
  } else {
    console.warn('⚠️ Obfuscation skipped: app.asar not found');
  }

  // --- STEP 2: FLIP ELECTRON FUSES ---
  let electronBinary;
  if (process.platform === 'darwin') {
    electronBinary = join(
      appOutDir,
      `${appName}.app`,
      'Contents',
      'MacOS',
      appName,
    );
  } else if (process.platform === 'win32') {
    electronBinary = join(appOutDir, `${appName}.exe`);
  } else {
    electronBinary = join(appOutDir, appName);
  }

  try {
    await flipFuses(electronBinary, {
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    });
    console.log('✅ Electron fuses flipped successfully');
  } catch (err) {
    console.warn('⚠️ Fuse flipping skipped:', err.message);
  }
};
