import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Capacitor Preferences
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('Mobile Download State', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should load empty downloads when no data stored', async () => {
    const { loadDownloads } = await import('@/capacitor/downloads/state');
    const items = await loadDownloads();
    expect(items).toEqual([]);
  });

  it('should load stored downloads', async () => {
    const { Preferences } = await import('@capacitor/preferences');
    vi.mocked(Preferences.get).mockResolvedValueOnce({
      value: JSON.stringify([
        { contentId: 'test-1', title: 'Test', status: 'COMPLETED' },
      ]),
    });

    const { loadDownloads } = await import('@/capacitor/downloads/state');
    const items = await loadDownloads();
    expect(items).toHaveLength(1);
    expect(items[0].contentId).toBe('test-1');
  });

  it('should save downloads to preferences', async () => {
    const { Preferences } = await import('@capacitor/preferences');
    const { saveDownloads } = await import('@/capacitor/downloads/state');

    await saveDownloads([
      {
        contentId: 'x',
        title: 'X',
        status: 'QUEUED',
        progress: 0,
        downloadedBytes: 0,
        createdAt: 0,
      } as any,
    ]);

    expect(Preferences.set).toHaveBeenCalledWith({
      key: 'nightwatch_downloads',
      value: expect.stringContaining('"contentId":"x"'),
    });
  });

  it('should notify progress listeners', async () => {
    const { onProgress, notifyProgress } = await import(
      '@/capacitor/downloads/state'
    );
    const cb = vi.fn();
    const unsub = onProgress(cb);

    notifyProgress({
      contentId: 'a',
      title: 'A',
      status: 'DOWNLOADING',
      progress: 50,
      downloadedBytes: 100,
      createdAt: 0,
    } as any);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ contentId: 'a', progress: 50 }),
    );

    unsub();
    notifyProgress({
      contentId: 'b',
      title: 'B',
      status: 'COMPLETED',
      progress: 100,
      downloadedBytes: 200,
      createdAt: 0,
    } as any);
    expect(cb).toHaveBeenCalledTimes(1); // Not called again after unsub
  });

  it('should track active abort controllers', async () => {
    const { activeAbortControllers } = await import(
      '@/capacitor/downloads/state'
    );
    const controller = new AbortController();
    activeAbortControllers.set('test', controller);
    expect(activeAbortControllers.has('test')).toBe(true);
    activeAbortControllers.delete('test');
    expect(activeAbortControllers.has('test')).toBe(false);
  });

  it('should export VAULT_DIR constant', async () => {
    const { VAULT_DIR } = await import('@/capacitor/downloads/state');
    expect(VAULT_DIR).toBe('OfflineVault');
  });
});
