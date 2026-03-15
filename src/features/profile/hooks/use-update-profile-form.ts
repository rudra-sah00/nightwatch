import React, { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/use-debounce';
import { useAuth } from '@/providers/auth-provider';
import type { ApiError } from '@/types';
import { checkUsername, updateProfile } from '../api';
import { updateProfileSchema } from '../schema';

export function useUpdateProfileForm() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [preferredServer, setPreferredServer] = useState<'s1' | 's2' | 's3'>(
    user?.preferredServer || 's2',
  );
  const debouncedUsername = useDebounce(username, 500);
  const [isCheckingUsername, startCheckTransition] = useTransition();
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
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
      const nameVal = formData.get('name') as string;
      const usernameVal = formData.get('username') as string;
      const preferredServerVal = formData.get('preferredServer') as
        | 's1'
        | 's2'
        | 's3';

      if (
        nameVal.trim() === (user?.name || '') &&
        usernameVal === (user?.username || '') &&
        preferredServerVal === (user?.preferredServer || 's2')
      ) {
        return { message: 'No changes to save', type: 'info' };
      }

      if (usernameVal !== (user?.username || '') && !isAvailable) {
        return { message: 'Username not available', type: 'error' };
      }

      const parsed = updateProfileSchema.safeParse({
        name: nameVal,
        username: usernameVal || undefined,
        preferredServer: preferredServerVal,
      });
      if (!parsed.success) {
        return {
          message: parsed.error.issues[0]?.message ?? 'Invalid input',
          type: 'error',
        };
      }

      try {
        const result = await updateProfile(parsed.data);
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

  // Guard: only react to state produced by an actual submit, not a cached
  // state restored when Next.js remounts the page after a tab switch.
  const wasPending = useRef(false);
  useEffect(() => {
    if (isPending) {
      wasPending.current = true;
      return;
    }
    if (!wasPending.current) return;
    wasPending.current = false;
    if (!state) return;
    if (state.type === 'success') {
      toast.success(state.message);
    } else if (state.type === 'error') {
      toast.error(state.message);
    } else if (state.type === 'info') {
      toast.info(state.message);
    }
  }, [state, isPending]);

  const hasChanges =
    name.trim() !== (user?.name || '') ||
    username !== (user?.username || '') ||
    preferredServer !== (user?.preferredServer || 's2');

  return {
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
  };
}
