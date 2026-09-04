import { describe, expect, it, vi } from 'vitest';
import { dismissMusic } from '@/features/music/lib/dismiss-music';

function deps(overrides: { isRemoteControlling?: boolean } = {}) {
  return {
    isRemoteControlling: false,
    stopLocal: vi.fn(),
    clearRemote: vi.fn(),
    sendRemoteStop: vi.fn(),
    ...overrides,
  };
}

describe('dismissMusic — local playback', () => {
  it('stops local playback', () => {
    const d = deps();
    dismissMusic(d);
    expect(d.stopLocal).toHaveBeenCalledTimes(1);
  });

  it('does not touch the remote when nothing is being controlled', () => {
    const d = deps();
    dismissMusic(d);
    expect(d.sendRemoteStop).not.toHaveBeenCalled();
    expect(d.clearRemote).not.toHaveBeenCalled();
  });
});

describe('dismissMusic — remote playback', () => {
  it('stops the other device as well as the local view', () => {
    // Clearing only locally would leave the other device playing on.
    const d = deps({ isRemoteControlling: true });
    dismissMusic(d);

    expect(d.sendRemoteStop).toHaveBeenCalledTimes(1);
    expect(d.clearRemote).toHaveBeenCalledTimes(1);
    expect(d.stopLocal).toHaveBeenCalledTimes(1);
  });

  it('tells the device to stop before forgetting which device it was', () => {
    const order: string[] = [];
    dismissMusic({
      isRemoteControlling: true,
      sendRemoteStop: () => order.push('sendRemoteStop'),
      clearRemote: () => order.push('clearRemote'),
      stopLocal: () => order.push('stopLocal'),
    });

    expect(order).toEqual(['sendRemoteStop', 'clearRemote', 'stopLocal']);
  });
});
