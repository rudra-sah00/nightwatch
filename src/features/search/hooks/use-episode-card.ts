'use client';

import { useState } from 'react';

/**
 * Minimal hook that tracks the image-error state for an {@link EpisodeCard}.
 *
 * @returns `imageError` flag and its setter.
 */
export function useEpisodeCard() {
  const [imageError, setImageError] = useState(false);
  return { imageError, setImageError };
}
