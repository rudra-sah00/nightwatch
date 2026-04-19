import { describe, expect, it } from 'vitest';

/**
 * Electron Dependency Smoke Test
 *
 * Verifies that every npm module required by the Electron main process
 * (and their deep transitive dependencies) can be resolved from the
 * project root. This catches pnpm hoisting issues that cause the
 * production asar bundle to ship with missing modules.
 */

const ELECTRON_REQUIRED_MODULES = [
  // Direct requires from electron/main.js & modules
  '@sentry/electron/main',
  'electron-store',
  'electron-log',
  'electron-updater',
  'electron-window-state',
  'electron-context-menu',
  'electron-asar-hot-updater',
  'discord-rpc',
  // Transitive deps that have caused production crashes
  'debug',
  'ms',
  'supports-color',
  'require-in-the-middle',
  // electron-store -> conf -> ajv chain
  'ajv',
  'fast-uri',
  'fast-deep-equal',
  'json-schema-traverse',
  'conf',
  'env-paths',
  'atomically',
  'dot-prop',
  'is-obj',
];

describe('Electron asar module resolution', () => {
  for (const mod of ELECTRON_REQUIRED_MODULES) {
    it(`resolves "${mod}" from project root`, () => {
      expect(() => require.resolve(mod)).not.toThrow();
    });
  }
});
