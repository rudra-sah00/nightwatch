'use client';

import { useState } from 'react';

export function useEpisodeCard() {
  const [imageError, setImageError] = useState(false);
  return { imageError, setImageError };
}
