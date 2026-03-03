'use client';

import { AlertCircle, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    error,
    success,
    hasChanges,
    action,
    isPending,
  } = useUpdateProfileForm();

  return (
    <form action={action} className="space-y-6 max-w-md">
      <div className="space-y-3">
        <Label
          htmlFor="name"
          className="text-sm font-medium text-foreground/90"
        >
          Display Name
        </Label>
        <div className="relative group">
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Name"
            required
            className="h-12 pl-4 rounded-xl bg-white/[0.03] border-white/[0.08] focus:border-indigo-500/30 focus:ring-indigo-500/20 transition-colors"
            name="name"
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label
          htmlFor="username"
          className="text-sm font-medium text-foreground/90"
        >
          Username
        </Label>
        <div className="relative group">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 font-medium">
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
            className="h-12 pl-9 pr-12 rounded-xl bg-white/[0.03] border-white/[0.08] focus:border-indigo-500/30 focus:ring-indigo-500/20 transition-colors"
            placeholder="username"
            name="username"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {isCheckingUsername ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              username !== user?.username &&
              username.length >= 3 &&
              (isAvailable ? (
                <div className="p-1 rounded-full bg-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
              ) : (
                <div className="p-1 rounded-full bg-destructive/20">
                  <XCircle className="w-4 h-4 text-destructive" />
                </div>
              ))
            )}
          </div>
        </div>
        {username !== user?.username ? (
          <div className="flex flex-col gap-1.5 pl-1">
            <p className="text-[11px] text-muted-foreground/60">
              Only lowercase letters, numbers, and underscores. (Min 3 chars)
            </p>
            {username.length > 0 && username.length < 3 ? (
              <p className="text-[11px] text-destructive/80 flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3" /> Too short
              </p>
            ) : null}
            {isAvailable === false && username.length >= 3 ? (
              <p className="text-[11px] text-destructive/80 flex items-center gap-1.5">
                <XCircle className="w-3 h-3" /> Username is already taken
              </p>
            ) : null}
            {isAvailable === true ? (
              <p className="text-[11px] text-emerald-400/80 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" /> Username is available
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground/90">
          Default Streaming Server
        </Label>
        <div className="grid grid-cols-2 gap-3 p-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setPreferredServer('s1')}
            className={`flex flex-col items-center gap-1 py-3 px-4 rounded-xl transition-colors ${
              preferredServer === 's1'
                ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 shadow-sm'
                : 'text-muted-foreground/60 hover:text-muted-foreground'
            }`}
          >
            <span className="text-sm font-semibold">Server 1</span>
            <span className="text-[10px] opacity-60">Standard</span>
          </button>
          <button
            type="button"
            onClick={() => setPreferredServer('s2')}
            className={`flex flex-col items-center gap-1 py-3 px-4 rounded-xl transition-colors ${
              preferredServer === 's2'
                ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 shadow-sm'
                : 'text-muted-foreground/60 hover:text-muted-foreground'
            }`}
          >
            <span className="text-sm font-semibold">Server 2</span>
            <span className="text-[10px] opacity-60">High Performance</span>
          </button>
        </div>
        <input type="hidden" name="preferredServer" value={preferredServer} />
        <p className="text-[10px] text-muted-foreground/50 pl-1 uppercase tracking-wider font-semibold">
          Preferred server for searching and playback
        </p>
      </div>

      {error ? (
        <div className="flex items-center gap-3 p-4 text-sm bg-destructive/10 text-destructive rounded-2xl border border-destructive/20">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="flex items-center gap-3 p-4 text-sm bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          Profile updated successfully
        </div>
      ) : null}

      <Button
        type="submit"
        className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-500/90 to-indigo-600/90 hover:from-indigo-500 hover:to-indigo-600 text-white font-medium shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-[colors,shadow] disabled:opacity-50 disabled:shadow-none"
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
