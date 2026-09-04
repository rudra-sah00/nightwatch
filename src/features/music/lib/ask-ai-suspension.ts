/**
 * Pausing background music for the duration of an Ask AI session.
 *
 * Ask AI keeps the microphone open so the service can detect an interruption,
 * which means music playing out of the same speakers leaks back in and can be
 * read as speech. Ducking to a low volume is not enough — playback is suspended
 * outright while a session is open.
 *
 * The rules are small but easy to get subtly wrong, hence the seam:
 *  - only resume if we were the ones who paused it, so a session started while
 *    music was already paused does not spontaneously start playing at the end
 *  - if Ask AI *chose* new music, there is nothing to restore, and resuming
 *    would fight the track it just started
 */

export interface SuspendablePlayer {
  isPlaying: () => boolean;
  togglePlay: () => void;
}

export interface AskAiSuspension {
  /** Pause playback if it is running, remembering that we did. */
  suspend(): void;
  /** Restore playback only if this helper paused it. */
  resume(): void;
  /** Drop the memory — Ask AI replaced the track, so nothing to restore. */
  forget(): void;
  readonly isSuspended: boolean;
}

export function createAskAiSuspension(
  player: SuspendablePlayer,
): AskAiSuspension {
  let suspended = false;

  return {
    suspend() {
      if (suspended) return;
      if (player.isPlaying()) {
        suspended = true;
        player.togglePlay();
      }
    },
    resume() {
      if (suspended && !player.isPlaying()) {
        player.togglePlay();
      }
      suspended = false;
    },
    forget() {
      suspended = false;
    },
    get isSuspended() {
      return suspended;
    },
  };
}
