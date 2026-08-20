import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MEDIAPIPE_WASM_VERSION } from '@/features/watch-party/interactions/hooks/useGestureDetection';

describe('MediaPipe WASM version pin', () => {
  it('matches the installed @mediapipe/tasks-vision version', () => {
    // The WASM runtime is fetched from jsDelivr at a pinned version. If it drifts
    // from the installed JS API, gesture detection fails at runtime with no
    // build-time error, so the mismatch is caught here instead.
    // Read via fs because the package's `exports` map does not expose package.json.
    const manifest = join(
      process.cwd(),
      'node_modules',
      '@mediapipe',
      'tasks-vision',
      'package.json',
    );
    const installed = JSON.parse(readFileSync(manifest, 'utf8'))
      .version as string;
    expect(MEDIAPIPE_WASM_VERSION).toBe(installed);
  });
});
