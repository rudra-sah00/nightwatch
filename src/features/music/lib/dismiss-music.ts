/**
 * Closing the music player outright.
 *
 * "Close" is not "pause": playback stops *and* the track is cleared, which is
 * what removes the floating disc and the mini player. `engine.stop()` sets
 * `currentTrack: null`, so the local half is just the store's stop action.
 *
 * The disc is also shown while another device is playing, and in that case
 * stopping locally would leave the other device playing on. The remote is told
 * to stop first, over the same `music:remote-command` channel the device picker
 * uses, before the local view is cleared.
 */

export interface DismissMusicDeps {
  isRemoteControlling: boolean;
  /** Store `stop()` — halts the engine and clears the current track. */
  stopLocal: () => void;
  /** Drops the mirrored remote state from this client. */
  clearRemote: () => void;
  /** Asks the controlling device to stop. */
  sendRemoteStop: () => void;
}

export function dismissMusic(deps: DismissMusicDeps): void {
  if (deps.isRemoteControlling) {
    // Order matters: tell the other device before forgetting who it was.
    deps.sendRemoteStop();
    deps.clearRemote();
  }
  deps.stopLocal();
}
