'use client';

import { Bell } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { PageTitle } from '@/components/layout/page-title';
import { ProfileBackButton } from '@/features/profile/components/profile-back-button';
import { apiFetch } from '@/lib/fetch';

interface NotifPrefs {
  friendRequests: boolean;
  /** Promotional / discovery suggestions — capped at 3 per day server-side. */
  suggestions: boolean;
}

const DEFAULT_PREFS: NotifPrefs = {
  friendRequests: true,
  suggestions: true,
};

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ preferences: NotifPrefs }>('/api/notifications/preferences')
      .then((r) => {
        setPrefs(r.preferences);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggle = useCallback(
    (key: keyof NotifPrefs) => {
      const updated = { ...prefs, [key]: !prefs[key] };
      setPrefs(updated);
      apiFetch('/api/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify(updated),
      }).catch(() => {
        // Revert on failure
        setPrefs(prefs);
      });
    },
    [prefs],
  );

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 animate-in fade-in duration-200 w-full">
      <PageTitle
        title="Notification Preferences"
        href="/profile/preferences/notifications"
      />
      <ProfileBackButton label="Preferences" />

      <div className="mt-6 space-y-1">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="font-headline font-bold text-lg">
            Push Notifications
          </h2>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }, (_, i) => `notif-skel-${i}`).map(
              (key) => (
                <div
                  key={key}
                  className="h-12 bg-muted animate-pulse rounded-xl"
                />
              ),
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <PrefToggle
              label="Friend Requests"
              description="New friend requests"
              checked={prefs.friendRequests}
              onChange={() => toggle('friendRequests')}
            />
            <PrefToggle
              label="Suggestions"
              description="Music, movie and manga picks — at most 3 a day"
              checked={prefs.suggestions}
              onChange={() => toggle('suggestions')}
            />
          </div>
        )}
      </div>
    </main>
  );
}

function PrefToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-border hover:bg-muted/30 transition-colors"
    >
      <div className="text-left">
        <p className="text-sm font-bold">{label}</p>
        <p className="text-xs text-foreground/50">{description}</p>
      </div>
      <div
        className={`w-10 h-6 rounded-full transition-colors relative ${checked ? 'bg-primary' : 'bg-muted'}`}
      >
        <div
          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`}
        />
      </div>
    </button>
  );
}
