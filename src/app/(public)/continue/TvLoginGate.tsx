'use client';

import { useEffect, useState } from 'react';
import { isTV } from '@/platforms/smart-tv/lib/detection';
import { TvLogin } from '@/platforms/smart-tv/pages/TvLogin';

/**
 * On TV, renders the QR login flow instead of the web login form.
 * Renders nothing on non-TV platforms so LoginClient shows.
 * Uses useEffect to avoid SSR hydration mismatch.
 */
export function TvLoginGate() {
  const [isTvMode, setIsTvMode] = useState(false);

  useEffect(() => {
    setIsTvMode(isTV());
  }, []);

  if (!isTvMode) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <TvLogin />
    </div>
  );
}
