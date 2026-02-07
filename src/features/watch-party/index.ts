// Watch Party feature exports

// API functions
export * from './api';
export { useAudioDucking } from './hooks/useAudioDucking';
export { useAudioStream } from './hooks/useAudioStream';
// Export new hooks
export { useClockSync } from './hooks/useClockSync';
export { useLiveKit } from './hooks/useLiveKit';
export { useLiveKitToken } from './hooks/useLiveKitToken';
export { useParticipantTracks } from './hooks/useParticipantTracks';
export { usePredictiveSync } from './hooks/usePredictiveSync';
// Types
export * from './types';
// Hooks
export { useWatchParty } from './useWatchParty';

// Components are not exported - import directly from ./components
