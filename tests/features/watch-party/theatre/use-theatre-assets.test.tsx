vi.mock('@/lib/fetch');
vi.mock('@/lib/analytics');

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTheatreAssets } from '@/features/watch-party/theatre/api';
import { useTheatreAssets } from '@/features/watch-party/theatre/hooks/use-theatre-assets';
import { useTheatreView } from '@/features/watch-party/theatre/lib/view-mode';
import type { TheatreAssetManifest } from '@/features/watch-party/theatre/types';

vi.mock('@/features/watch-party/theatre/api', () => ({
  getTheatreAssets: vi.fn(),
}));

const mockGetAssets = vi.mocked(getTheatreAssets);

const manifest = {
  version: 'v2',
  baseUrl: 'https://assets.example.test',
  models: {
    room: 'https://assets.example.test/theatre/v2/models/room.glb',
    cafe: 'https://assets.example.test/theatre/v2/models/cafe.glb',
    chair: 'https://assets.example.test/theatre/v2/models/chair.glb',
    avatar: 'https://assets.example.test/theatre/v2/models/avatar-boy.glb',
  },
  animations: { dance: {} },
} as unknown as TheatreAssetManifest;

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

/**
 * `useTheatrePreload()` — and therefore this hook — is mounted by
 * `ActiveWatchParty` for every participant, so an ungated query would request the
 * manifest for people who never open 3D. That is both a pointless request and,
 * while `/api/theatre/assets` was mounted `restrictTo('user')`, a guaranteed 403
 * for every anonymous guest in the party.
 */
describe('useTheatreAssets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAssets.mockResolvedValue(manifest);
    useTheatreView.setState({ enabled: false });
  });

  it('does not request the manifest before the user opts into 3D', async () => {
    const { result } = renderHook(() => useTheatreAssets(), {
      wrapper: createWrapper(),
    });

    // Give a real fetch time to happen, so this cannot pass by being early.
    await new Promise((r) => setTimeout(r, 20));

    expect(mockGetAssets).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
    expect(result.current.isError).toBe(false);
  });

  it('requests the manifest once 3D is enabled', async () => {
    useTheatreView.setState({ enabled: true });

    const { result } = renderHook(() => useTheatreAssets(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(manifest);
    });
    expect(mockGetAssets).toHaveBeenCalledTimes(1);
  });

  // Opting in mid-party is the normal path: the toggle lives in watch-party
  // settings, so the hook is already mounted and idle when it flips.
  it('starts fetching when the toggle flips while already mounted', async () => {
    const { result } = renderHook(() => useTheatreAssets(), {
      wrapper: createWrapper(),
    });

    expect(mockGetAssets).not.toHaveBeenCalled();

    act(() => {
      useTheatreView.setState({ enabled: true });
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(manifest);
    });
    expect(mockGetAssets).toHaveBeenCalledTimes(1);
  });
});
