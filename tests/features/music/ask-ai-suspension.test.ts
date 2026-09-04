import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import {
  type AskAiSuspension,
  createAskAiSuspension,
} from '@/features/music/lib/ask-ai-suspension';

let playing: boolean;
let togglePlay: Mock<() => void>;
let suspension: AskAiSuspension;

beforeEach(() => {
  playing = false;
  // Mirrors the engine: togglePlay flips the playing state.
  togglePlay = vi.fn(() => {
    playing = !playing;
  });
  suspension = createAskAiSuspension({
    isPlaying: () => playing,
    togglePlay: () => togglePlay(),
  });
});

describe('suspend', () => {
  it('pauses music that is playing', () => {
    playing = true;
    suspension.suspend();

    expect(togglePlay).toHaveBeenCalledTimes(1);
    expect(playing).toBe(false);
    expect(suspension.isSuspended).toBe(true);
  });

  it('does nothing when music is already paused', () => {
    suspension.suspend();

    expect(togglePlay).not.toHaveBeenCalled();
    expect(suspension.isSuspended).toBe(false);
  });

  it('is idempotent', () => {
    playing = true;
    suspension.suspend();
    suspension.suspend();
    expect(togglePlay).toHaveBeenCalledTimes(1);
  });
});

describe('resume', () => {
  it('restores music it paused', () => {
    playing = true;
    suspension.suspend();
    togglePlay.mockClear();

    suspension.resume();

    expect(togglePlay).toHaveBeenCalledTimes(1);
    expect(playing).toBe(true);
    expect(suspension.isSuspended).toBe(false);
  });

  it('does not start music that was already paused before the session', () => {
    // Opening Ask AI while nothing is playing must not begin playback on exit.
    suspension.suspend();
    suspension.resume();
    expect(togglePlay).not.toHaveBeenCalled();
    expect(playing).toBe(false);
  });

  it('does nothing when called without a preceding suspend', () => {
    suspension.resume();
    expect(togglePlay).not.toHaveBeenCalled();
  });

  it('does not double-toggle when playback resumed by other means', () => {
    playing = true;
    suspension.suspend();
    // User hit play in the mini-player while the session was open.
    playing = true;
    togglePlay.mockClear();

    suspension.resume();

    expect(togglePlay).not.toHaveBeenCalled();
    expect(playing).toBe(true);
  });
});

describe('forget', () => {
  it('stops a later resume from fighting AI-chosen music', () => {
    // Ask AI paused the old track, then started a new one via play_music.
    playing = true;
    suspension.suspend();
    suspension.forget();
    playing = true; // the new track is now playing
    togglePlay.mockClear();

    suspension.resume();

    expect(togglePlay).not.toHaveBeenCalled();
    expect(playing).toBe(true);
  });

  it('clears the suspended flag', () => {
    playing = true;
    suspension.suspend();
    expect(suspension.isSuspended).toBe(true);

    suspension.forget();
    expect(suspension.isSuspended).toBe(false);
  });
});
