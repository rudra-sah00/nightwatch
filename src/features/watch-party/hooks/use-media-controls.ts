'use client';

import { useState } from 'react';

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
