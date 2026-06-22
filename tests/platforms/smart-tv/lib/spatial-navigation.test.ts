import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockInit = vi.fn();
const mockSetKeyMap = vi.fn();

vi.mock('@noriginmedia/norigin-spatial-navigation', () => ({
  init: (...args: unknown[]) => mockInit(...args),
  setKeyMap: (...args: unknown[]) => mockSetKeyMap(...args),
}));

describe('initSpatialNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('calls init with correct config', async () => {
    const { initSpatialNavigation } = await import(
      '@/platforms/smart-tv/lib/spatial-navigation'
    );
    initSpatialNavigation();
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        debug: false,
        visualDebug: false,
        throttle: 150,
      }),
    );
  });

  it('calls setKeyMap with arrow keys', async () => {
    const { initSpatialNavigation } = await import(
      '@/platforms/smart-tv/lib/spatial-navigation'
    );
    initSpatialNavigation();
    expect(mockSetKeyMap).toHaveBeenCalledWith({
      left: 37,
      right: 39,
      up: 38,
      down: 40,
      enter: 13,
    });
  });

  it('only initializes once (idempotent)', async () => {
    const { initSpatialNavigation } = await import(
      '@/platforms/smart-tv/lib/spatial-navigation'
    );
    initSpatialNavigation();
    initSpatialNavigation();
    expect(mockInit).toHaveBeenCalledTimes(1);
  });
});
