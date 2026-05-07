'use client';

import { Globe, Loader2, LogOut, Monitor, Smartphone } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/fetch';

interface Session {
  sessionId: string;
  device: string;
  createdAt: number;
  isCurrent: boolean;
}

function parseDevice(ua: string): {
  icon: typeof Monitor;
  label: string;
  color: string;
} {
  const lower = ua.toLowerCase();
  if (lower === 'desktop app')
    return { icon: Monitor, label: 'Desktop App', color: 'text-neo-blue' };
  if (
    lower.includes('mobile') ||
    lower.includes('android') ||
    lower.includes('iphone')
  )
    return { icon: Smartphone, label: 'Mobile', color: 'text-neo-green' };
  if (lower.includes('electron'))
    return { icon: Monitor, label: 'Desktop App', color: 'text-neo-blue' };
  if (lower.includes('chrome'))
    return { icon: Globe, label: 'Chrome', color: 'text-neo-yellow' };
  if (lower.includes('firefox'))
    return { icon: Globe, label: 'Firefox', color: 'text-neo-yellow' };
  if (lower.includes('safari'))
    return { icon: Globe, label: 'Safari', color: 'text-neo-yellow' };
  return { icon: Globe, label: 'Browser', color: 'text-neo-yellow' };
}

function timeAgo(timestamp: number): string {
  if (!timestamp) return 'Unknown';
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ActiveDevices() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const data = await apiFetch<{ sessions: Session[] }>(
        '/api/auth/sessions',
      );
      setSessions(data.sessions);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevoke = async (sessionId: string) => {
    setRevoking(sessionId);
    try {
      await apiFetch(`/api/auth/sessions/${sessionId}`, { method: 'DELETE' });
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
      toast.success('Device signed out');
    } catch {
      toast.error('Failed to sign out device');
    } finally {
      setRevoking(null);
    }
  };

  if (loading) {
    return (
      <section className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-8">
        <h2 className="text-4xl font-black font-headline uppercase tracking-tighter mb-8 flex items-center gap-3">
          <Monitor className="w-7 h-7 text-neo-blue" />
          Active Devices
        </h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  return (
    <section className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-8">
      <h2 className="text-4xl font-black font-headline uppercase tracking-tighter mb-8 flex items-center gap-3">
        <Monitor className="w-7 h-7 text-neo-blue" />
        Active Devices
      </h2>

      <div className="space-y-3">
        {sessions.map((session) => {
          const { icon: Icon, label, color } = parseDevice(session.device);
          return (
            <div
              key={session.sessionId}
              className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card"
            >
              <Icon className={`w-5 h-5 ${color} shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-headline font-bold">
                  {label}
                  {session.isCurrent ? (
                    <span className="ml-2 text-xs text-neo-green font-semibold">
                      This device
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {session.createdAt
                    ? `Signed in ${timeAgo(session.createdAt)}`
                    : 'Unknown'}
                </p>
              </div>
              {!session.isCurrent ? (
                <button
                  type="button"
                  onClick={() => handleRevoke(session.sessionId)}
                  disabled={revoking === session.sessionId}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-headline font-bold text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 active:scale-95 transition-all disabled:opacity-50"
                >
                  {revoking === session.sessionId ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <LogOut className="w-3 h-3" />
                  )}
                  Sign out
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {sessions.filter((s) => !s.isCurrent).length > 1 ? (
        <button
          type="button"
          onClick={async () => {
            const others = sessions.filter((s) => !s.isCurrent);
            for (const s of others) {
              await apiFetch(`/api/auth/sessions/${s.sessionId}`, {
                method: 'DELETE',
              });
            }
            setSessions((prev) => prev.filter((s) => s.isCurrent));
            toast.success('All other devices signed out');
          }}
          className="mt-6 px-4 py-2 text-sm font-headline font-bold text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 active:scale-95 transition-all"
        >
          Sign out all other devices
        </button>
      ) : null}
    </section>
  );
}
