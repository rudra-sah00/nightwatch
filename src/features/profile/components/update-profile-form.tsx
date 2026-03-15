'use client';

import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useUpdateProfileForm } from '../hooks/use-update-profile-form';

export function UpdateProfileForm() {
  const {
    user,
    name,
    setName,
    username,
    setUsername,
    preferredServer,
    setPreferredServer,
    isCheckingUsername,
    isAvailable,
    hasChanges,
    action,
    isPending,
  } = useUpdateProfileForm();

  return (
    <form action={action} className="space-y-5">
      {/* Name */}
      <div className="space-y-2">
        <Label
          htmlFor="name"
          className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wider"
        >
          Display Name
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your Name"
          required
          name="name"
          className="h-11 rounded-xl bg-white/[0.03] border-white/[0.08] focus:border-indigo-500/30 focus:ring-indigo-500/20"
        />
      </div>

      {/* Username */}
      <div className="space-y-2">
        <Label
          htmlFor="username"
          className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wider"
        >
          Username
        </Label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 text-sm">
            @
          </span>
          <Input
            id="username"
            value={username}
            onChange={(e) =>
              setUsername(
                e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''),
              )
            }
            className="h-11 pl-8 pr-10 rounded-xl bg-white/[0.03] border-white/[0.08] focus:border-indigo-500/30 focus:ring-indigo-500/20"
            placeholder="username"
            name="username"
          />
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            {isCheckingUsername ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground/50" />
            ) : (
              username !== user?.username &&
              username.length >= 3 &&
              (isAvailable ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-destructive" />
              ))
            )}
          </div>
        </div>
        {username !== user?.username && username.length > 0 ? (
          <p
            className={cn(
              'text-[11px] pl-0.5',
              username.length < 3
                ? 'text-muted-foreground/50'
                : isAvailable === false
                  ? 'text-destructive/70'
                  : isAvailable === true
                    ? 'text-emerald-400/70'
                    : 'text-muted-foreground/50',
            )}
          >
            {username.length < 3
              ? 'Min 3 characters — letters, numbers, underscores'
              : isAvailable === false
                ? 'Already taken'
                : isAvailable === true
                  ? 'Available'
                  : 'Checking...'}
          </p>
        ) : null}
      </div>

      {/* Server Preference */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wider">
          Default Server
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 's1' as const, label: 'Netflix', sub: 'Standard' },
            { id: 's2' as const, label: 'Balanced', sub: 'Performance' },
            { id: 's3' as const, label: 'High Quality Stream', sub: 'HLS 4K' },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setPreferredServer(s.id)}
              className={cn(
                'flex flex-col items-center gap-0.5 py-3 rounded-xl text-sm transition-colors border',
                preferredServer === s.id
                  ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                  : 'bg-white/[0.02] border-white/[0.06] text-muted-foreground/60 hover:text-muted-foreground',
              )}
            >
              <span className="font-semibold text-[13px]">{s.label}</span>
              <span className="text-[10px] opacity-60">{s.sub}</span>
            </button>
          ))}
        </div>
        <input type="hidden" name="preferredServer" value={preferredServer} />
      </div>

      {/* Feedback */}
      <Button
        type="submit"
        className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors disabled:opacity-40"
        isLoading={isPending}
        disabled={
          isPending ||
          !hasChanges ||
          (username !== user?.username && isAvailable === false) ||
          (username.length > 0 && username.length < 3)
        }
      >
        Save Changes
      </Button>
    </form>
  );
}
