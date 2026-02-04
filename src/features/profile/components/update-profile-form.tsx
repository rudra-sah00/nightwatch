import { AlertCircle, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button, Input, Label } from '@/components/ui';
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
  const [isLoading, setIsLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username !== user?.username && isAvailable === false) return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updateProfile({ name, username });
      updateUser(result.user);
      setSuccess(true);
      toast.success('Profile updated successfully');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const apiError = err as ApiError;
      const msg = apiError.message || 'Failed to update profile';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
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
        {username !== user?.username && (
          <div className="flex flex-col gap-1.5 pl-1">
            <p className="text-[11px] text-muted-foreground/60">
              Only lowercase letters, numbers, and underscores. (Min 3 chars)
            </p>
            {username.length > 0 && username.length < 3 && (
              <p className="text-[11px] text-destructive/80 flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3" /> Too short
              </p>
            )}
            {isAvailable === false && username.length >= 3 && (
              <p className="text-[11px] text-destructive/80 flex items-center gap-1.5">
                <XCircle className="w-3 h-3" /> Username is already taken
              </p>
            )}
            {isAvailable === true && (
              <p className="text-[11px] text-emerald-400/80 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" /> Username is available
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 text-sm bg-destructive/10 text-destructive rounded-2xl border border-destructive/20">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 p-4 text-sm bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          Profile updated successfully
        </div>
      )}

      <Button
        type="submit"
        className="w-full h-12 rounded-xl bg-gradient-to-r from-red-500/90 to-red-600/90 hover:from-red-500 hover:to-red-600 text-white font-medium shadow-lg shadow-red-500/20 hover:shadow-red-500/30 transition-all disabled:opacity-50 disabled:shadow-none"
        disabled={
          isLoading ||
          (username !== user?.username && isAvailable === false) ||
          (username.length > 0 && username.length < 3)
        }
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Save Changes
      </Button>
    </form>
  );
}
