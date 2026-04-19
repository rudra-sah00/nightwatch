import { describe, expect, it } from 'vitest';

/**
 * Electron Dependency Smoke Test
 *
 * Verifies that every npm module required by the Electron main process
 * (and their deep transitive dependencies) can be resolved from the
 * project root. This catches pnpm hoisting issues that cause the
 * production asar bundle to ship with missing modules.
 *
 * If this test fails, a module is not reachable from the top-level
 * node_modules — meaning electron-builder will NOT include it in the
 * asar and the app will crash on launch.
 */

const ELECTRON_REQUIRED_MODULES = [
  // Direct requires from electron/main.js
  '@sentry/electron/main',
  'electron-store',
  'electron-log',
  'electron-updater',
  'electron-window-state',
  'electron-context-menu',
  'electron-asar-hot-updater',
  'discord-rpc',
  // Deep transitive deps that have caused production crashes
  'debug',
  'ms',
  'require-in-the-middle',
];

describe('Electron asar module resolution', () => {
  for (const mod of ELECTRON_REQUIRED_MODULES) {
    it(`resolves "${mod}" from project root`, () => {
      expect(() => require.resolve(mod)).not.toThrow();
    });
  }
});
