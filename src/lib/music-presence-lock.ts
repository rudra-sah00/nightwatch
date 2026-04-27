// Lightweight global signal so DiscordPresenceSync (root layout) knows when
// MusicDiscordPresence (protected layout) is actively controlling presence.
// Needed because the two components live in different provider trees.

let _locked = false;

export const musicPresenceLock = {
  acquire: () => {
    _locked = true;
  },
  release: () => {
    _locked = false;
  },
  isLocked: () => _locked,
};
