'use client';

import { useEffect, useState } from 'react';
import {
  hasAnsweredConsent,
  setAnalyticsConsent,
} from '@/lib/analytics-consent';

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!hasAnsweredConsent()) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  const respond = (accepted: boolean) => {
    setAnalyticsConsent(accepted);
    setShow(false);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] mx-auto max-w-lg animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="rounded-2xl border-2 border-border bg-card p-4 shadow-xl">
        <p className="text-sm text-foreground/80">
          We use cookies for analytics to improve your experience. No data is
          shared with third parties for advertising.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => respond(true)}
            className="rounded-full bg-neo-yellow px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-black transition-transform hover:scale-105 active:scale-95"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => respond(false)}
            className="rounded-full border-2 border-border px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-foreground/60 transition-transform hover:scale-105 active:scale-95"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
