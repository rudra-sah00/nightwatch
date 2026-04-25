/**
 * afterSign.cjs — intentionally empty.
 *
 * All pre-signing work (ASAR obfuscation + fuse flipping) now runs in
 * afterPack.cjs so the code signature covers the final binary state.
 *
 * This file is kept as a no-op because electron-builder config references it.
 */
exports.default = async function afterSign(_context) {
  // Nothing to do — see afterPack.cjs
};
