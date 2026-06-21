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
    <div className="fixed bottom-0 left-0 right-0 z-[9999] w-full backdrop-blur-md bg-background/70 border-t border-border/50 px-4 py-3 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="mx-auto max-w-lg flex flex-col items-center gap-2 text-center">
        <p className="text-xs text-foreground/70">
          We use cookies for analytics to improve your experience.
        </p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => respond(true)}
            className="text-xs font-bold uppercase tracking-wide text-foreground hover:text-neo-yellow transition-colors"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => respond(false)}
            className="text-xs font-bold uppercase tracking-wide text-foreground/50 hover:text-foreground transition-colors"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
