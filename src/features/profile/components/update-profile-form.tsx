import { AlertCircle, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button, Input, Label } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';
import type { ApiError } from '@/types';
import { checkUsername, updateProfile } from '../api';

export function UpdateProfileForm() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Real-time username check
  useEffect(() => {
    if (!username || username === user?.username) {
      setIsAvailable(null);
      setIsCheckingUsername(false);
      return;
    }

    if (username.length < 3) {
      setIsAvailable(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingUsername(true);
      try {
        const { available } = await checkUsername(username);
        setIsAvailable(available);
      } catch {
        toast.error('Failed to check username availability');
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [username, user?.username]);

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Display Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your Name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
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
            className="pl-7 pr-10"
            placeholder="username"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isCheckingUsername ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              username !== user?.username &&
              username.length >= 3 &&
              (isAvailable ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <XCircle className="w-4 h-4 text-destructive" />
              ))
            )}
          </div>
        </div>
        {username !== user?.username && (
          <div className="flex flex-col gap-1">
            <p className="text-[10px] text-muted-foreground">
              Only lowercase letters, numbers, and underscores. (Min 3 chars)
            </p>
            {username.length > 0 && username.length < 3 && (
              <p className="text-[10px] text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Too short
              </p>
            )}
            {isAvailable === false && username.length >= 3 && (
              <p className="text-[10px] text-destructive flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Username is already taken
              </p>
            )}
            {isAvailable === true && (
              <p className="text-[10px] text-emerald-500 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Username is available
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 text-sm bg-emerald-500/10 text-emerald-500 rounded-lg border border-emerald-500/20">
          <CheckCircle2 className="w-4 h-4" />
          Profile updated successfully
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
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
