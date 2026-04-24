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
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.2,
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
  const electronDir = join(context.appOutDir, 'resources', 'app', 'electron');
  let count = 0;

  try {
    const files = walkDir(electronDir);
    for (const file of files) {
      const code = readFileSync(file, 'utf8');
      const result = obfuscate(code, OBFUSCATION_OPTIONS);
      writeFileSync(file, result.getObfuscatedCode());
      count++;
    }
    console.log(`✅ Obfuscated ${count} Electron JS files`);
  } catch (err) {
    console.warn('⚠️ Obfuscation skipped:', err.message);
  }
};
