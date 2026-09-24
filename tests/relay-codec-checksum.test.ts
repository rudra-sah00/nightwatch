import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guards the wire codec against divergence between the two repositories.
 *
 * `relay/lib/codec.ts` here and `src/relay/codec.ts` in nightwatch-backend must be
 * byte-identical. A skew between them is the worst class of bug this feature can
 * have: nothing throws, nothing logs, avatars simply appear in slightly wrong places
 * and the cause is three layers below where the symptom shows.
 *
 * CI cannot diff across two checkouts, so both repos pin the same hash. Change the
 * codec and this test fails in BOTH repos until the file is copied across and the
 * constant updated in both — which is exactly the friction that keeps them honest.
 *
 * To update deliberately:
 *   cp src/features/watch-party/relay/lib/codec.ts \
 *      ../nightwatch-backend/src/relay/codec.ts
 *   shasum -a 256 src/features/watch-party/relay/lib/codec.ts
 * then paste the digest into this constant and the backend's copy of this test.
 */
const EXPECTED_SHA256 =
  'f29a59ef93809300aa496065a547c76ebfef482cbf6aaf935f4a458e75ee277b';

const CODEC_PATH = join(
  process.cwd(),
  'src',
  'features',
  'watch-party',
  'relay',
  'lib',
  'codec.ts',
);

describe('relay codec checksum', () => {
  it('matches the digest pinned in nightwatch-backend', () => {
    const contents = readFileSync(CODEC_PATH);
    const digest = createHash('sha256').update(contents).digest('hex');
    expect(digest).toBe(EXPECTED_SHA256);
  });

  it('contains no repo-specific path, which would make the copies diverge', () => {
    const text = readFileSync(CODEC_PATH, 'utf8');
    // The doc comment names both locations; neither may appear as an import.
    expect(text).not.toMatch(/^\s*import\s/m);
  });
});
