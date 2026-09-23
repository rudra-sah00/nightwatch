import { act, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSeatOccupancy } from '@/features/watch-party/theatre/hooks/use-seat-occupancy';
import { getSeat, spawnFor } from '@/features/watch-party/theatre/lib/layout';
import type { Stance } from '@/features/watch-party/theatre/lib/stance';
import { useTheatreView } from '@/features/watch-party/theatre/lib/view-mode';

/**
 * The reported flow, at the level it actually happens: the view mode lives in a
 * zustand store, the seat hook is mounted above the 2D/3D switch, and the scene
 * itself mounts and unmounts as the mode changes.
 *
 * A hook-level test that rerenders with `active: false` then `active: true` does
 * NOT reproduce this — it keeps everything in one render tree with stable props,
 * which is exactly the assumption worth checking.
 */

const listeners = {
  claim: new Set<unknown>(),
  join: new Set<unknown>(),
  left: new Set<unknown>(),
};

vi.mock('@/features/watch-party/room/services/watch-party.api', () => ({
  onSeatClaim: (cb: unknown) => {
    listeners.claim.add(cb);
    return () => listeners.claim.delete(cb);
  },
  onMemberJoined: (cb: unknown) => {
    listeners.join.add(cb);
    return () => listeners.join.delete(cb);
  },
  onMemberLeft: (cb: unknown) => {
    listeners.left.add(cb);
    return () => listeners.left.delete(cb);
  },
}));

/** Set by the harness so a test can press `E`. */
let standUp: (() => void) | null = null;

/**
 * Stands in for TheatreScene: mounted only in 3D, and it computes its entry point
 * exactly the way the real one does — seat first, remembered stance second, spawn
 * slot last — then reports what it resolved.
 */
function Scene({
  mySeat,
  stanceRef,
  walkTo,
}: {
  mySeat: string | null;
  stanceRef: { current: Stance | null };
  /** A position the player walks to while this mount is alive, if any. */
  walkTo?: Stance;
}) {
  const entry = useRef<string | null>(null);
  if (entry.current === null) {
    if (mySeat) {
      const seat = getSeat(mySeat as Parameters<typeof getSeat>[0]);
      entry.current = `seat:${seat.id}`;
    } else if (stanceRef.current) {
      const s = stanceRef.current;
      entry.current = `stood:${s.x},${s.z}`;
    } else {
      const s = spawnFor('me');
      entry.current = `spawn:${s.x},${s.z}`;
    }
  }
  // The walk controller writes the stance every frame while walking.
  if (walkTo) stanceRef.current = walkTo;

  return (
    <div data-testid="scene">
      <span data-testid="seat">{mySeat ?? 'standing'}</span>
      <span data-testid="entry">{entry.current}</span>
    </div>
  );
}

/** Stands in for WatchPartyVideoArea. */
function VideoArea({
  memberIds,
  walkTo,
}: {
  memberIds: string[];
  walkTo?: Stance;
}) {
  const mode = useTheatreView((s) => s.mode);
  const is3D = mode !== '2d';
  const { mySeat, claimSeat } = useSeatOccupancy({
    userId: 'me',
    memberIds,
    enabled: true,
    active: is3D,
  });
  const stanceRef = useRef<Stance | null>(null);
  // The `E` key path, reachable from the test.
  standUp = () => claimSeat(null);
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      {is3D ? (
        <Scene mySeat={mySeat} stanceRef={stanceRef} walkTo={walkTo} />
      ) : null}
    </div>
  );
}

function setMode(mode: '2d' | '3d' | 'cinema') {
  act(() => {
    useTheatreView.setState({ mode });
  });
}

describe('seat state across a 2D <-> 3D round trip, driven by the store', () => {
  beforeEach(() => {
    listeners.claim.clear();
    listeners.join.clear();
    listeners.left.clear();
    standUp = null;
    // `setMode` on the store refuses unless assets are ready; the test drives the
    // field directly, so mirror the ready state for realism.
    useTheatreView.setState({ mode: '2d', phase: 'ready', enabled: true });
  });

  it('keeps the seat when the scene unmounts and remounts', () => {
    render(<VideoArea memberIds={['me', 'alice']} />);

    setMode('3d');
    const seated = screen.getByTestId('seat').textContent;
    expect(seated).not.toBe('standing');

    setMode('2d');
    expect(screen.queryByTestId('scene')).toBeNull();

    setMode('3d');
    expect(screen.getByTestId('seat').textContent).toBe(seated);
  });

  it('keeps it across several round trips', () => {
    render(<VideoArea memberIds={['me', 'alice']} />);
    setMode('3d');
    const seated = screen.getByTestId('seat').textContent;

    for (let i = 0; i < 4; i += 1) {
      setMode('2d');
      setMode('3d');
    }
    expect(screen.getByTestId('seat').textContent).toBe(seated);
  });

  it('keeps it through screen focus, which is also a 3D mode', () => {
    render(<VideoArea memberIds={['me', 'alice']} />);
    setMode('3d');
    const seated = screen.getByTestId('seat').textContent;
    setMode('cinema');
    expect(screen.getByTestId('seat').textContent).toBe(seated);
    setMode('2d');
    setMode('3d');
    expect(screen.getByTestId('seat').textContent).toBe(seated);
  });

  it('keeps it when the roster array identity changes, as it does on every tick', () => {
    // `presentMemberIds` produces a fresh array whenever `room.members` changes,
    // which happens on every playback state update.
    const { rerender } = render(<VideoArea memberIds={['me', 'alice']} />);
    setMode('3d');
    const seated = screen.getByTestId('seat').textContent;

    rerender(<VideoArea memberIds={['me', 'alice']} />);
    setMode('2d');
    rerender(<VideoArea memberIds={['me', 'alice', 'bob']} />);
    setMode('3d');

    expect(screen.getByTestId('seat').textContent).toBe(seated);
  });

  it('opens the eyes in the seat, not on the rear platform', () => {
    /*
      A claim outlives the scene, so a returning viewer must START seated. Seeding
      the camera from the spawn slot and letting `useSeatedCamera` lerp to the chair
      is what made a re-entry look like a reset: for the first half second you are
      back where you began, behind both rows, watching the room slide past.
    */
    render(<VideoArea memberIds={['me', 'alice']} />);
    setMode('3d');
    const seat = screen.getByTestId('seat').textContent;
    setMode('2d');
    setMode('3d');
    expect(screen.getByTestId('entry').textContent).toBe(`seat:${seat}`);
  });

  it('resumes a walking position for someone who stood up', () => {
    const walkTo = { x: 1.2, y: 0, z: 4.5, yaw: -35 };
    const { rerender } = render(
      <VideoArea memberIds={['me', 'alice']} walkTo={walkTo} />,
    );

    setMode('3d');
    // Auto-seated on entry, then they stand and walk to the front row.
    expect(screen.getByTestId('seat').textContent).not.toBe('standing');
    act(() => {
      standUp?.();
    });
    expect(screen.getByTestId('seat').textContent).toBe('standing');

    setMode('2d');
    rerender(<VideoArea memberIds={['me', 'alice']} />);
    setMode('3d');

    expect(screen.getByTestId('entry').textContent).toBe('stood:1.2,4.5');
  });

  it('falls back to the spawn slot only on a first entry', () => {
    render(<VideoArea memberIds={[]} />);
    // An empty roster means it has not loaded, so nobody is auto-seated yet.
    setMode('3d');
    const spawn = spawnFor('me');
    expect(screen.getByTestId('entry').textContent).toBe(
      `spawn:${spawn.x},${spawn.z}`,
    );
  });
});
