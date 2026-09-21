import { describe, expect, it } from 'vitest';
import {
  avatarUrlFor,
  IDENTITY_COLOURS,
  identityColour,
  identityHash,
} from '@/features/watch-party/theatre/lib/avatar-instance';
import {
  avatarModelForCharacter,
  avatarModels,
  type TheatreAssetManifest,
} from '@/features/watch-party/theatre/types';

function manifest(
  models: Partial<TheatreAssetManifest['models']>,
): TheatreAssetManifest {
  return {
    version: 'v1',
    baseUrl: 'https://assets.nightwatch.in',
    models: {
      room: 'https://a/room.glb',
      cafe: 'https://a/cafe.glb',
      chair: 'https://a/chair.glb',
      avatar: 'https://a/avatar-boy.glb',
      ...models,
    },
    animations: {
      clipsEmbedded: true,
      locomotion: null,
      seating: null,
      dance: {},
    },
  };
}

describe('avatarModels', () => {
  it('falls back to the single avatar when no list is published', () => {
    expect(avatarModels(manifest({}))).toEqual(['https://a/avatar-boy.glb']);
  });

  it('prefers the avatars list when present', () => {
    const m = manifest({
      avatars: ['https://a/avatar-boy.glb', 'https://a/avatar-girl.glb'],
    });
    expect(avatarModels(m)).toEqual([
      'https://a/avatar-boy.glb',
      'https://a/avatar-girl.glb',
    ]);
  });

  it('ignores an empty avatars list rather than rendering nothing', () => {
    expect(avatarModels(manifest({ avatars: [] }))).toEqual([
      'https://a/avatar-boy.glb',
    ]);
  });

  it('drops duplicates and blank entries', () => {
    const m = manifest({
      avatars: ['https://a/x.glb', 'https://a/x.glb', ''],
    });
    expect(avatarModels(m)).toEqual(['https://a/x.glb']);
  });
});

describe('avatarModelForCharacter', () => {
  const m = manifest({
    avatars: [
      'https://a/theatre/v2/models/avatar-boy.glb',
      'https://a/theatre/v2/models/avatar-girl.glb',
    ],
  });

  it('maps man to the boy model and woman to the girl model', () => {
    expect(avatarModelForCharacter(m, 'man')).toBe(
      'https://a/theatre/v2/models/avatar-boy.glb',
    );
    expect(avatarModelForCharacter(m, 'woman')).toBe(
      'https://a/theatre/v2/models/avatar-girl.glb',
    );
  });

  it('matches on filename, not on the path prefix', () => {
    const moved = manifest({
      avatars: ['https://cdn/x/y/girl-avatar.glb', 'https://cdn/x/y/boy.glb'],
    });
    expect(avatarModelForCharacter(moved, 'woman')).toBe(
      'https://cdn/x/y/girl-avatar.glb',
    );
  });

  it('falls back to the only model when one is published', () => {
    const single = manifest({ avatars: ['https://a/solo.glb'] });
    expect(avatarModelForCharacter(single, 'woman')).toBe('https://a/solo.glb');
  });

  it('falls back to the first model when nothing matches', () => {
    const odd = manifest({
      avatars: ['https://a/one.glb', 'https://a/two.glb'],
    });
    expect(avatarModelForCharacter(odd, 'woman')).toBe('https://a/one.glb');
  });

  it('returns null when nothing is published', () => {
    const empty = manifest({ avatar: '', avatars: [] });
    expect(avatarModelForCharacter(empty, 'man')).toBeNull();
  });
});

describe('identityHash', () => {
  it('is stable for the same id', () => {
    expect(identityHash('user-abc')).toBe(identityHash('user-abc'));
  });

  it('is never negative, so it is safe as a modulo index', () => {
    // long ids overflow the |0 accumulator into negatives before Math.abs
    for (const id of ['a', 'zzzzzzzzzzzzzzzzzzzzzzzz', 'user-99999999999']) {
      expect(identityHash(id)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('identityColour', () => {
  it('always returns a colour from the palette', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(IDENTITY_COLOURS).toContain(identityColour(`user-${i}`));
    }
  });

  it('gives the same person the same colour on every client', () => {
    expect(identityColour('rudra')).toBe(identityColour('rudra'));
  });
});

describe('avatarUrlFor', () => {
  const urls = ['boy.glb', 'girl.glb'];

  it('returns null with no models so callers can fall back', () => {
    expect(avatarUrlFor([], 'anyone')).toBeNull();
  });

  it('always picks one of the supplied models', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(urls).toContain(avatarUrlFor(urls, `user-${i}`));
    }
  });

  it('is deterministic, so a peer does not change character on reconnect', () => {
    expect(avatarUrlFor(urls, 'user-7')).toBe(avatarUrlFor(urls, 'user-7'));
  });

  it('distributes across the available models', () => {
    const seen = new Set(
      Array.from({ length: 60 }, (_, i) => avatarUrlFor(urls, `peer-${i}`)),
    );
    expect(seen.size).toBe(2);
  });

  it('handles a single model', () => {
    expect(avatarUrlFor(['only.glb'], 'user-1')).toBe('only.glb');
  });
});
