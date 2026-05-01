import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
}));

vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn(),
    notification: vi.fn(),
    vibrate: vi.fn(),
  },
  ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM', Heavy: 'HEAVY' },
  NotificationType: { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' },
}));

describe('Haptics utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not fire haptics on non-native platform', async () => {
    const { hapticLight, hapticMedium, hapticSuccess, hapticError } =
      await import('@/lib/haptics');
    const { Haptics } = await import('@capacitor/haptics');

    hapticLight();
    hapticMedium();
    hapticSuccess();
    hapticError();

    expect(Haptics.impact).not.toHaveBeenCalled();
    expect(Haptics.notification).not.toHaveBeenCalled();
  });

  it('should export all haptic functions', async () => {
    const mod = await import('@/lib/haptics');
    expect(typeof mod.hapticLight).toBe('function');
    expect(typeof mod.hapticMedium).toBe('function');
    expect(typeof mod.hapticSuccess).toBe('function');
    expect(typeof mod.hapticError).toBe('function');
  });
});
