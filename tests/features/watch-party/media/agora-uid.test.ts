import { describe, expect, it, vi } from 'vitest';
import {
  buildUidToMemberMap,
  generateNumericUid,
  handleDeviceError,
} from '@/features/watch-party/media/lib/agora-uid';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
const { toast } = await import('sonner');

describe('generateNumericUid', () => {
  /*
    This hash is a CROSS-REPO contract. The backend mints an Agora token for the
    uid it derives in `agora.service.ts`; the client joins the channel as the uid
    it derives here. If the two ever disagree the token is valid for a different
    uid and the join is rejected — which presents as "voice chat silently never
    connects", with nothing wrong in either repo on its own.

    These vectors are the pin. They are the plain output of the shared algorithm:
      hash = 0; for each char: hash = ((hash << 5) - hash + code) | 0
      return hash >>> 0 || 1
  */
  it.each([
    ['u1', 3676],
    ['user_123', 4028758974],
    ['guest_a1b2c3', 2090136695],
    ['a', 97],
  ])('hashes %s deterministically', (input, expected) => {
    expect(generateNumericUid(input)).toBe(expected);
  });

  it('is stable across calls', () => {
    expect(generateNumericUid('user_123')).toBe(generateNumericUid('user_123'));
  });

  it('never returns zero, so Agora treats it as a real uid', () => {
    // An empty id hashes to 0, which Agora reads as "assign me one".
    expect(generateNumericUid('')).toBe(1);
  });

  it('stays inside the unsigned 32-bit range Agora accepts', () => {
    for (const id of ['user_123', 'guest_zzzzzzzz', 'x'.repeat(200)]) {
      const uid = generateNumericUid(id);
      expect(uid).toBeGreaterThan(0);
      expect(uid).toBeLessThanOrEqual(4_294_967_295);
      expect(Number.isInteger(uid)).toBe(true);
    }
  });
});

describe('buildUidToMemberMap', () => {
  it('inverts the roster, keying on the stringified uid', () => {
    const map = buildUidToMemberMap([
      { id: 'user_123', name: 'Ann' },
      { id: 'guest_a1b2c3', name: 'Bob' },
    ]);

    expect(map.get(String(generateNumericUid('user_123')))?.name).toBe('Ann');
    expect(map.get(String(generateNumericUid('guest_a1b2c3')))?.name).toBe(
      'Bob',
    );
  });

  it('is empty for an empty roster', () => {
    expect(buildUidToMemberMap([]).size).toBe(0);
  });
});

describe('handleDeviceError', () => {
  const t = (key: string) => key;

  it('maps a permission failure to the permission message', () => {
    vi.mocked(toast.error).mockClear();
    handleDeviceError(new Error('NotAllowedError'), 'Microphone', t);
    expect(toast.error).toHaveBeenCalledWith('permissionDenied');
  });

  it('maps a missing device to the not-found message', () => {
    vi.mocked(toast.error).mockClear();
    handleDeviceError(new Error('NotFoundError'), 'Camera', t);
    expect(toast.error).toHaveBeenCalledWith('deviceNotFound');
  });

  it('falls back to the generic message', () => {
    vi.mocked(toast.error).mockClear();
    handleDeviceError(new Error('something else'), 'Camera', t);
    expect(toast.error).toHaveBeenCalledWith('deviceAccessFailed');
  });

  it('tolerates a non-Error rejection', () => {
    vi.mocked(toast.error).mockClear();
    handleDeviceError('Permission denied by policy', 'Microphone', t);
    expect(toast.error).toHaveBeenCalledWith('permissionDenied');
  });
});
