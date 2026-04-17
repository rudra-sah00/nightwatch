const { Transform } = require('node:stream');
const { app, safeStorage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

let SECRET_KEY = null;

function getSecretKey() {
  if (SECRET_KEY) return SECRET_KEY;

  try {
    // We defer the app.getPath until the function is first called
    // to ensure app is ready.
    const keyPath = path.join(app.getPath('userData'), 'vault-key.bin');

    if (fs.existsSync(keyPath)) {
      const encryptedKey = fs.readFileSync(keyPath);
      if (safeStorage.isEncryptionAvailable()) {
        const decryptedStr = safeStorage.decryptString(encryptedKey);
        SECRET_KEY = Buffer.from(decryptedStr, 'hex');
      } else {
        SECRET_KEY = encryptedKey;
      }
    } else {
      SECRET_KEY = crypto.randomBytes(32);
      if (safeStorage.isEncryptionAvailable()) {
        fs.writeFileSync(
          keyPath,
          safeStorage.encryptString(SECRET_KEY.toString('hex')),
        );
      } else {
        fs.writeFileSync(keyPath, SECRET_KEY);
      }
    }
  } catch (error) {
    console.error('Failed to init secure vault key, using fallback', error);
    SECRET_KEY = Buffer.from('watch-rudra-fallback-vault-key-2026', 'utf-8');
  }

  return SECRET_KEY;
}

class XorStream extends Transform {
  constructor(startOffset = 0, options) {
    super(options);
    this.offset = startOffset;
    this.key = getSecretKey();
  }

  _transform(chunk, _encoding, callback) {
    for (let i = 0; i < chunk.length; i++) {
      chunk[i] ^= this.key[(this.offset + i) % this.key.length];
    }
    this.offset += chunk.length;
    this.push(chunk);
    callback();
  }
}

module.exports = { XorStream };
