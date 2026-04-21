const { Transform } = require('node:stream');
const { app, safeStorage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

let SECRET_KEY = null;

function getSecretKey() {
  if (SECRET_KEY) return SECRET_KEY;

  try {
    const keyPath = path.join(app.getPath('userData'), 'vault-key.bin');

    if (fs.existsSync(keyPath)) {
      const encryptedKey = fs.readFileSync(keyPath);
      if (safeStorage.isEncryptionAvailable()) {
        const decryptedStr = safeStorage.decryptString(encryptedKey);
        SECRET_KEY = Buffer.from(decryptedStr, 'hex');
      } else {
        // safeStorage unavailable (e.g. headless Linux) — key stored raw
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
        // No OS keychain — store raw. User is warned at download time.
        console.warn(
          '[cipher] safeStorage unavailable — vault key stored unencrypted',
        );
        fs.writeFileSync(keyPath, SECRET_KEY);
      }
    }
  } catch (error) {
    console.error('[cipher] Failed to init vault key:', error.message);
    // Generate an ephemeral key — downloads from this session won't be
    // readable after restart, but we never use a hardcoded fallback.
    SECRET_KEY = crypto.randomBytes(32);
  }

  return SECRET_KEY;
}

/**
 * Derives a deterministic 16-byte IV from the byte offset so that
 * encrypt and decrypt produce the same CTR counter for any given
 * position in the file. This allows random-access reads (range requests).
 */
function deriveIV(startOffset) {
  // Use first 12 bytes as a fixed nonce, last 4 bytes as the block counter
  // derived from the offset. AES-256-CTR increments the full 16-byte IV
  // internally, so we just need the starting counter to match.
  const iv = Buffer.alloc(16, 0);
  // Write the block index (offset / 16) into the last 4 bytes as big-endian
  const blockIndex = Math.floor(startOffset / 16);
  iv.writeUInt32BE(blockIndex, 12);
  return iv;
}

/**
 * AES-256-CTR streaming transform. Drop-in replacement for the old XorStream.
 * CTR mode supports random-access decryption via the startOffset parameter,
 * which is critical for HTTP range requests on offline media.
 */
class CipherStream extends Transform {
  constructor(startOffset = 0, options) {
    super(options);
    const key = getSecretKey();
    const iv = deriveIV(startOffset);
    // AES-256-CTR encrypt and decrypt are the same operation
    this._cipher = crypto.createCipheriv('aes-256-ctr', key, iv);

    // If startOffset isn't block-aligned, we need to skip the partial block
    const skip = startOffset % 16;
    if (skip > 0) {
      // Advance the cipher by encrypting `skip` dummy bytes
      this._cipher.update(Buffer.alloc(skip));
    }
  }

  _transform(chunk, _encoding, callback) {
    try {
      this.push(this._cipher.update(chunk));
      callback();
    } catch (err) {
      callback(err);
    }
  }

  _flush(callback) {
    try {
      const final = this._cipher.final();
      if (final.length > 0) this.push(final);
      callback();
    } catch (err) {
      callback(err);
    }
  }
}

// Keep backward-compatible export name so existing require() calls work
module.exports = { XorStream: CipherStream };
