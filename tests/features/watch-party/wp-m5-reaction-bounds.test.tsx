/**
 * Regression tests for AUDIT.md WP-M5 — the sketch reaction list grew without bound.
 *
 * The same defect WP-H1 fixed for floating emoji, and costlier per entry: every reaction carries 12
 * particles, and the animation loop rebuilds each particle object on every frame, so the per-frame work
 * is twelve times the number of live reactions. Entries left only on their own 1500 ms timer, which
 * bounds nothing when arrivals outpace expiry.
 *
 * Narrower than WP-H1 in that `SKETCH_REACTION` is draw-gated, so a sender needs the host to have
 * enabled drawing. Fixed anyway, because leaving one of two identical defects is how the first came to
 * be overlooked.
 *
 * Counted through the rendered particle nodes rather than internal state, so the assertion is about what
 * the browser is actually asked to draw.
 */
import { act, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SketchOverlay } from '@/features/watch-party/interactions/components/SketchOverlay';
import { SketchProvider } from '@/features/watch-party/interactions/context/SketchContext';
import { dispatchRtmMessage } from '@/features/watch-party/room/services/rtm-events';
import type { RTMMessage } from '@/features/watch-party/room/types/rtm-messages';

/** Each reaction renders its 12 particles as Konva Stars; counting them counts reactions x 12. */
vi.mock('react-konva', () => {
  const stub = (testid: string) => () => <div data-testid={testid} />;
  return {
    Stage: ({ children }: { children: ReactNode }) => (
      <div data-testid="konva-stage">{children}</div>
    ),
    Layer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Line: stub('konva-line'),
    Rect: stub('konva-rect'),
    Circle: stub('konva-circle'),
    Arrow: stub('konva-arrow'),
    Text: stub('konva-text'),
    RegularPolygon: stub('konva-poly'),
    Group: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Label: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Tag: stub('konva-tag'),
    Transformer: stub('konva-transformer'),
    Star: stub('konva-star'),
  };
});

/** Mirrors the constant in the component. Duplicated on purpose — reading it would prove nothing. */
const MAX_ACTIVE_REACTIONS = 12;
const PARTICLES_PER_REACTION = 12;

function reaction(over: Record<string, unknown> = {}) {
  return {
    type: 'SKETCH_REACTION',
    kind: 'sparkle',
    x: 10,
    y: 20,
    color: '#fff',
    userId: 'G1',
    ...over,
  } as unknown as RTMMessage;
}

function mount() {
  render(
    <SketchProvider>
      <SketchOverlay rtmSendMessage={vi.fn()} userId="u1" userName="Me" />
    </SketchProvider>,
  );
}

function send(n: number, over: Record<string, unknown> = {}) {
  act(() => {
    for (let i = 0; i < n; i++) dispatchRtmMessage(reaction(over));
  });
}

/** Live reactions, inferred from rendered particle nodes. */
function liveReactions() {
  return screen.queryAllByTestId('konva-star').length / PARTICLES_PER_REACTION;
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('WP-M5 — reaction bounds', () => {
  it('renders a single reaction', () => {
    mount();
    send(1);
    expect(liveReactions()).toBe(1);
  });

  it('caps a flood of reactions', () => {
    mount();
    send(200);
    expect(liveReactions()).toBe(MAX_ACTIVE_REACTIONS);
  });

  it('does not exceed the cap however many arrive', () => {
    mount();
    send(20);
    expect(liveReactions()).toBe(MAX_ACTIVE_REACTIONS);
    send(500);
    expect(liveReactions()).toBe(MAX_ACTIVE_REACTIONS);
  });

  it.each([
    ['NaN x', { x: Number.NaN }],
    ['NaN y', { y: Number.NaN }],
    ['Infinity x', { x: Number.POSITIVE_INFINITY }],
    ['a string x', { x: 'left' }],
    ['a missing x', { x: undefined }],
  ])('refuses a reaction with %s', (_label, over) => {
    mount();
    send(1, over);
    expect(liveReactions()).toBe(0);
  });

  /* Coordinates of 0 are perfectly valid and must not be mistaken for missing. */
  it('accepts a reaction at the origin', () => {
    mount();
    send(1, { x: 0, y: 0 });
    expect(liveReactions()).toBe(1);
  });

  /* Negative coordinates are legitimate too — the overlay can be scrolled or offset. */
  it('accepts negative coordinates', () => {
    mount();
    send(1, { x: -5, y: -5 });
    expect(liveReactions()).toBe(1);
  });

  /* The cap is a ceiling, not a replacement for expiry: everything still clears. */
  it('still clears all reactions once they expire', () => {
    mount();
    send(50);
    expect(liveReactions()).toBe(MAX_ACTIVE_REACTIONS);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(liveReactions()).toBe(0);
  });
});
