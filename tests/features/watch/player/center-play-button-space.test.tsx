/**
 * Regression tests for the Space-key collision that made holding Space machine-gun
 * play/pause instead of speeding playback up.
 *
 * `CenterPlayButton` is a `tabIndex={0}` button covering the whole player. Clicking the
 * centre to start playback focused it, so every auto-repeat `keydown` from a held Space
 * toggled playback again — a rapid stutter — and left the video paused, which in turn
 * stopped the hold-to-speed-up boost from ever engaging.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CenterPlayButton } from '@/features/watch/player/ui/controls/PlayPause';

vi.mock('@/features/watch/player/hooks/useMobileDetection', () => ({
  useMobileDetection: () => false,
}));

function renderCentre(onToggle: () => void, isPlaying = false) {
  render(
    <CenterPlayButton
      isPlaying={isPlaying}
      onToggle={onToggle}
      metadata={{ title: 'Test', type: 'movie' }}
    />,
  );
  return screen.getByRole('button');
}

describe('CenterPlayButton — Space key ownership', () => {
  it('is not in the keyboard tab order (the control bar owns play/pause)', () => {
    const btn = renderCentre(vi.fn());
    expect(btn.getAttribute('tabindex')).toBe('-1');
  });

  it('does not toggle on Space — the global player shortcut owns that key', () => {
    const onToggle = vi.fn();
    const btn = renderCentre(onToggle);

    fireEvent.keyDown(btn, { key: ' ', code: 'Space' });

    expect(onToggle).not.toHaveBeenCalled();
  });

  it('does not re-toggle on auto-repeat while Space is held', () => {
    const onToggle = vi.fn();
    const btn = renderCentre(onToggle);

    fireEvent.keyDown(btn, { key: ' ', code: 'Space' });
    for (let i = 0; i < 12; i++) {
      fireEvent.keyDown(btn, { key: ' ', code: 'Space', repeat: true });
    }

    expect(onToggle).not.toHaveBeenCalled();
  });

  it('does not take focus on click, so a later Space cannot reach it', () => {
    const btn = renderCentre(vi.fn());

    fireEvent.mouseDown(btn);

    expect(document.activeElement).not.toBe(btn);
  });

  it('still resumes playback on a mouse click', () => {
    const onToggle = vi.fn();
    const btn = renderCentre(onToggle);

    fireEvent.click(btn);

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('does not resume when the host controls playback', () => {
    const onToggle = vi.fn();
    render(
      <CenterPlayButton
        isPlaying={false}
        onToggle={onToggle}
        disabled
        metadata={{ title: 'Test', type: 'movie' }}
      />,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(onToggle).not.toHaveBeenCalled();
  });
});
