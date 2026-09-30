/**
 * Regression tests for AUDIT.md WP-M6 — a failed device switch kept the new device selected.
 *
 * `switchAudioDevice` committed the selection before attempting the switch and never rolled it back when
 * `setDevice` threw. That did not end with the error toast: the selection feeds `selectedAudioDeviceRef`,
 * and that ref is what `toggleAudio` reads for `microphoneId` when it builds a fresh track. So a failed
 * switch left the dropdown naming a device that was not in use, and the next mute/unmute retried the
 * failing device — a transient failure became a stuck one. `refreshDevices` does not rescue it: it only
 * replaces the selection when a device has vanished from the enumerated list, not when it is present but
 * unusable.
 *
 * The pre-existing failure test in `useAgora.test.ts` asserted only that `setDevice` was called with the
 * bad id, so the selection was never covered either way.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import type { IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  resetAgoraState,
  useAgora,
} from '@/features/watch-party/media/hooks/useAgora';

const stableT = (key: string) => key;
vi.mock('next-intl', () => ({
  useTranslations: () => stableT,
  useLocale: () => 'en',
  useMessages: () => ({}),
  useNow: () => new Date(),
  useTimeZone: () => 'UTC',
  useFormatter: () => ({
    number: (n: number) => String(n),
    dateTime: (d: Date) => d.toISOString(),
    relativeTime: (d: Date) => d.toISOString(),
  }),
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

const { mockClient, mockAudioTrack, mockMic } = vi.hoisted(() => ({
  mockClient: {
    on: vi.fn(),
    off: vi.fn(),
    removeAllListeners: vi.fn(),
    join: vi.fn().mockImplementation(async () => {
      mockClient.connectionState = 'CONNECTED';
      return 1;
    }),
    leave: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockResolvedValue(undefined),
    unpublish: vi.fn().mockResolvedValue(undefined),
    enableAudioVolumeIndicator: vi.fn(),
    remoteUsers: [],
    connectionState: 'DISCONNECTED',
  },
  mockAudioTrack: {
    close: vi.fn(),
    stop: vi.fn(),
    play: vi.fn(),
    setDevice: vi.fn().mockResolvedValue(undefined),
  },
  /** Two real microphones, so a switch has somewhere to go and somewhere to fall back to. */
  mockMic: [
    { kind: 'audioinput', deviceId: 'mic-a', label: 'Mic A' },
    { kind: 'audioinput', deviceId: 'mic-b', label: 'Mic B' },
  ],
}));

vi.mock('agora-rtc-sdk-ng', () => ({
  default: {
    createClient: vi.fn().mockReturnValue(mockClient),
    onAutoplayFailed: null,
    setLogLevel: vi.fn(),
    getDevices: vi.fn().mockResolvedValue(mockMic),
    createMicrophoneAudioTrack: vi.fn().mockResolvedValue(mockAudioTrack),
    createCameraVideoTrack: vi.fn().mockResolvedValue({}),
  },
}));

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
    }),
    enumerateDevices: vi.fn().mockResolvedValue(mockMic),
  },
  configurable: true,
});

const options = {
  token: 't',
  appId: 'a',
  channel: 'c',
  uid: 1,
  userId: 'user-1',
  members: [{ id: 'user-1', name: 'Me' }],
};

/** Mounts a connected client with the microphone live, which is what makes setDevice reachable. */
async function mountWithLiveMic() {
  vi.mocked(AgoraRTC.createMicrophoneAudioTrack).mockResolvedValue(
    mockAudioTrack as unknown as IMicrophoneAudioTrack,
  );
  mockClient.connectionState = 'CONNECTED';

  const hook = renderHook(() => useAgora(options));
  await waitFor(() => expect(hook.result.current.isConnected).toBe(true), {
    timeout: 3000,
  });
  await act(async () => {
    await hook.result.current.toggleAudio();
  });
  await waitFor(() => expect(hook.result.current.audioEnabled).toBe(true));
  return hook;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockClient.connectionState = 'DISCONNECTED';
  mockAudioTrack.setDevice.mockResolvedValue(undefined);
  resetAgoraState(
    AgoraRTC as unknown as typeof import('agora-rtc-sdk-ng').default,
  );
});

describe('WP-M6 — a failed device switch must not stay selected', () => {
  it('keeps the new device when the switch succeeds', async () => {
    const { result } = await mountWithLiveMic();
    const before = result.current.selectedAudioDevice;

    await act(async () => {
      await result.current.switchAudioDevice('mic-b');
    });

    expect(result.current.selectedAudioDevice).toBe('mic-b');
    expect(result.current.selectedAudioDevice).not.toBe(before);
  });

  /* The defect: the failing device stayed selected. */
  it('reverts to the previous device when the switch fails', async () => {
    const { result } = await mountWithLiveMic();
    const before = result.current.selectedAudioDevice;

    mockAudioTrack.setDevice.mockRejectedValueOnce(new Error('device in use'));
    await act(async () => {
      await result.current.switchAudioDevice('mic-b');
    });

    expect(result.current.selectedAudioDevice).toBe(before);
    expect(result.current.selectedAudioDevice).not.toBe('mic-b');
  });

  /*
    The consequence that made this worth fixing rather than cosmetic: the stale selection was reused when
    the next track was built, so the failing device was tried again.
  */
  it('does not build the next track against the device that just failed', async () => {
    const { result } = await mountWithLiveMic();

    mockAudioTrack.setDevice.mockRejectedValueOnce(new Error('device in use'));
    await act(async () => {
      await result.current.switchAudioDevice('mic-b');
    });

    // Mute, then unmute — the second unmute creates a fresh track from the selection.
    await act(async () => {
      await result.current.toggleAudio();
    });
    vi.mocked(AgoraRTC.createMicrophoneAudioTrack).mockClear();
    await act(async () => {
      await result.current.toggleAudio();
    });

    const lastCall = vi.mocked(AgoraRTC.createMicrophoneAudioTrack).mock
      .calls[0]?.[0] as { microphoneId?: string } | undefined;
    expect(lastCall?.microphoneId).not.toBe('mic-b');
  });

  /* With no live track there is nothing to switch, so the choice is a preference and simply sticks. */
  it('records the choice when no track is live', async () => {
    mockClient.connectionState = 'CONNECTED';
    const { result } = renderHook(() => useAgora(options));
    await waitFor(() => expect(result.current.isConnected).toBe(true), {
      timeout: 3000,
    });

    await act(async () => {
      await result.current.switchAudioDevice('mic-b');
    });

    expect(result.current.selectedAudioDevice).toBe('mic-b');
    expect(mockAudioTrack.setDevice).not.toHaveBeenCalled();
  });
});
