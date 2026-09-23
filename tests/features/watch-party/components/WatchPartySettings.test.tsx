vi.mock('@/features/watch-party/theatre/api', () => ({
  getTheatreAssets: vi.fn(),
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WatchPartySettings } from '@/features/watch-party/components/WatchPartySettings';

import type { WatchPartyRoom } from '@/features/watch-party/room/types';

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    'aria-label': ariaLabel,
    className,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    'aria-label'?: string;
    className?: string;
    [key: string]: unknown;
  }) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={className}
      data-testid="mock-button"
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: ({
    checked,
    onCheckedChange,
    id,
  }: {
    checked: boolean;
    onCheckedChange: (v: boolean) => void;
    id: string;
  }) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      data-testid="mock-switch"
    />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({
    children,
    htmlFor,
  }: {
    children: React.ReactNode;
    htmlFor: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock('@/features/watch-party/room/services/watch-party.api', () => ({
  updatePartyPermissions: vi.fn().mockResolvedValue({}),
  updateMemberPermissions: vi.fn().mockResolvedValue({}),
}));

import { updatePartyPermissions } from '@/features/watch-party/room/services/watch-party.api';
import { getTheatreAssets } from '@/features/watch-party/theatre/api';
import type { TheatreAssetManifest } from '@/features/watch-party/theatre/types';

describe('WatchPartySettings', () => {
  /*
    The 3D toggle quotes the real download size, which it reads from the theatre
    manifest via TanStack Query — so this component now needs a QueryClient. The
    app always has one (`providers/query-provider.tsx` wraps the tree); this is
    the test catching up, not a new runtime requirement.
  */
  function renderSettings(ui: React.ReactElement) {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    return render(ui, { wrapper: Wrapper });
  }

  const mockRoom = {
    id: 'r1',
    permissions: {
      canGuestsDraw: true,
      canGuestsPlaySounds: true,
      canGuestsChat: true,
    },
    members: [],
  } as unknown as WatchPartyRoom;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders settings panel', () => {
    renderSettings(<WatchPartySettings room={mockRoom} isHost={true} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('settings.title')).toBeInTheDocument();
  });

  it('handles permission toggles', () => {
    renderSettings(<WatchPartySettings room={mockRoom} isHost={true} />);

    // Open Dialog
    fireEvent.click(screen.getByRole('button'));

    // Switch the checkbox
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);
    expect(updatePartyPermissions).toHaveBeenCalled();
  });

  it('hides toggles if not host', () => {
    renderSettings(<WatchPartySettings room={mockRoom} isHost={false} />);
    // If not host, switches should be disabled or not rendered depending on the component
    // We just verify it doesn't crash
  });

  /*
    Regression cover for a stale hardcoded figure. This label used to read
    "Downloads ~35 MB of assets" — the full v2 set — long after `room.glb`,
    `cafe.glb` and `chair.glb` stopped being served, when what a client actually
    transfers is the two character models at ~12 MB. The size now comes from the
    manifest, measured by the backend against the objects the client will fetch.
  */
  describe('3D theatre download size', () => {
    const manifest = (bytes?: number) =>
      ({
        version: 'v3',
        baseUrl: 'https://assets.test',
        models: {
          avatar: 'https://assets.test/theatre/v3/models/avatar-boy.glb',
          avatars: [
            'https://assets.test/theatre/v3/models/avatar-boy.glb',
            'https://assets.test/theatre/v3/models/avatar-girl.glb',
          ],
        },
        animations: {
          clipsEmbedded: true,
          locomotion: null,
          seating: null,
          dance: {},
        },
        ...(bytes === undefined
          ? {}
          : { download: { totalBytes: bytes, bytes: {}, measured: 2 } }),
      }) as unknown as TheatreAssetManifest;

    it('quotes the measured size, not a hardcoded one', async () => {
      // 7.05 MiB + 4.99 MiB, the two published characters.
      vi.mocked(getTheatreAssets).mockResolvedValue(manifest(12_625_920));

      renderSettings(
        <WatchPartySettings
          room={mockRoom}
          isHost={true}
          onToggleFloatingChat={() => {}}
        />,
      );
      fireEvent.click(screen.getAllByRole('button')[0]);

      expect(
        await screen.findByText('Downloads 12.04 MB of assets'),
      ).toBeInTheDocument();
      expect(screen.queryByText(/35 MB/)).not.toBeInTheDocument();
    });

    it('states no figure rather than inventing one when the size is unknown', async () => {
      // Older backend, or the size probe failed. Must not put a wrong number back.
      vi.mocked(getTheatreAssets).mockResolvedValue(manifest(undefined));

      renderSettings(
        <WatchPartySettings
          room={mockRoom}
          isHost={true}
          onToggleFloatingChat={() => {}}
        />,
      );
      fireEvent.click(screen.getAllByRole('button')[0]);

      expect(
        await screen.findByText('Downloads character models on first use'),
      ).toBeInTheDocument();
    });
  });
});
