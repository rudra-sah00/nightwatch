'use client';

import { AlertCircle, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import React, { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDebounce } from '@/hooks/use-debounce';
import { useAuth } from '@/providers/auth-provider';
import type { ApiError } from '@/types';
import { checkUsername, updateProfile } from '../api';

export function UpdateProfileForm() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const debouncedUsername = useDebounce(username, 500);
  const [isCheckingUsername, startCheckTransition] = useTransition();
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [_isLoading, _setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Real-time username check with debounced value
  useEffect(() => {
    if (!debouncedUsername || debouncedUsername === user?.username) {
      setIsAvailable(null);
      return;
    }

    if (debouncedUsername.length < 3) {
      setIsAvailable(false);
      return;
    }

    startCheckTransition(async () => {
      try {
        const { available } = await checkUsername(debouncedUsername);
        setIsAvailable(available);
      } catch {
        toast.error('Failed to check username availability');
      }
    });
  }, [debouncedUsername, user?.username]);

  const [state, action, isPending] = React.useActionState(
    async (
      _prevState: { message: string; type: string } | null,
      formData: FormData,
    ) => {
      const name = formData.get('name') as string;
      const username = formData.get('username') as string;

      if (
        name.trim() === (user?.name || '') &&
        username === (user?.username || '')
      ) {
        return { message: 'No changes to save', type: 'info' };
      }

      if (username !== user?.username && !isAvailable) {
        return { message: 'Username not available', type: 'error' };
      }

      try {
        const result = await updateProfile({ name, username });
        updateUser(result.user);
        return { message: 'Profile updated successfully', type: 'success' };
      } catch (err) {
        const apiError = err as ApiError;
        return {
          message: apiError.message || 'Failed to update profile',
          type: 'error',
        };
      }
    },
    null,
  );

  useEffect(() => {
    if (state) {
      if (state.type === 'success') {
        toast.success(state.message);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else if (state.type === 'error') {
        setError(state.message);
        toast.error(state.message);
      } else if (state.type === 'info') {
        toast.info(state.message);
      }
    }
  }, [state]);

  const hasChanges =
    name.trim() !== (user?.name || '') || username !== (user?.username || '');

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
            className="h-12 pl-4 rounded-xl bg-white/[0.03] border-white/[0.08] focus:border-red-500/30 focus:ring-red-500/20 transition-all"
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
            className="h-12 pl-9 pr-12 rounded-xl bg-white/[0.03] border-white/[0.08] focus:border-red-500/30 focus:ring-red-500/20 transition-all"
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
        className="w-full h-12 rounded-xl bg-gradient-to-r from-red-500/90 to-red-600/90 hover:from-red-500 hover:to-red-600 text-white font-medium shadow-lg shadow-red-500/20 hover:shadow-red-500/30 transition-all disabled:opacity-50 disabled:shadow-none"
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
