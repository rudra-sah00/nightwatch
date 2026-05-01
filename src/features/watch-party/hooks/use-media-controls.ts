'use client';

import { useState } from 'react';

/**
 * Hook managing the visibility state of audio and video device selection dropdowns.
 *
 * @returns Toggle state and setters for audio and video device picker visibility.
 */
export function useMediaControls() {
  const [showAudioDevices, setShowAudioDevices] = useState(false);
  const [showVideoDevices, setShowVideoDevices] = useState(false);

  return {
    showAudioDevices,
    setShowAudioDevices,
    showVideoDevices,
    setShowVideoDevices,
  };
}
