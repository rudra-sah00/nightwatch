import { useTranslations } from 'next-intl';
import React, { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/use-debounce';
import { useAuth } from '@/providers/auth-provider';
import type { ApiError } from '@/types';
import { checkUsername, deleteAccount, updateProfile } from '../api';
import { updateProfileSchema } from '../schema';

/**
 * Hook that manages the update-profile form (name, username, preferred server)
 * and the account-deletion flow.
 *
 * Performs debounced username-availability checks, validates input via
 * {@link updateProfileSchema}, submits changes through the `updateProfile`
 * API, and shows contextual toasts. Also exposes a `handleDeleteAccount`
 * callback that deletes the account and logs the user out.
 *
 * @returns Form field values, setters, availability status, form `action`,
 *          pending/deleting flags, delete-dialog state, and action handlers.
 */
export function useUpdateProfileForm() {
  const t = useTranslations('profile');
  const { user, updateUser, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [preferredServer, setPreferredServer] = useState<'s1' | 's2' | 's3'>(
    user?.preferredServer || 's2',
  );
  const debouncedUsername = useDebounce(username, 500);
  const [isCheckingUsername, startCheckTransition] = useTransition();
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isInitialized = useRef(false);

  // Sync state when user becomes available (fixes initial load empty state)
  // Only sync ONCE to avoid clearing inputs when the user is typing
  useEffect(() => {
    if (user && !isInitialized.current) {
      const nextName = user.name || '';
      const nextUsername = user.username || '';
      const nextServer = user.preferredServer || 's2';

      if (name !== nextName) {
        setName(nextName);
      }
      if (username !== nextUsername) {
        setUsername(nextUsername);
      }
      if (preferredServer !== nextServer) {
        setPreferredServer(nextServer);
      }
      isInitialized.current = true;
    }
  }, [name, preferredServer, user, username]);

  useEffect(() => {
    if (!debouncedUsername || debouncedUsername === user?.username) {
      if (isAvailable !== null) {
        setIsAvailable(null);
      }
      return;
    }
    if (debouncedUsername.length < 3) {
      if (isAvailable !== false) {
        setIsAvailable(false);
      }
      return;
    }
    startCheckTransition(async () => {
      try {
        const { available } = await checkUsername(debouncedUsername);
        setIsAvailable(available);
      } catch {
        toast.error(t('messages.usernameFailed'));
      }
    });
  }, [debouncedUsername, isAvailable, user?.username, t]);

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
        return { message: t('messages.noChanges'), type: 'info' };
      }

      if (usernameVal !== (user?.username || '') && !isAvailable) {
        return { message: t('messages.usernameNotAvailable'), type: 'error' };
      }

      const parsed = updateProfileSchema.safeParse({
        name: nameVal,
        username: usernameVal || undefined,
        preferredServer: preferredServerVal,
      });
      if (!parsed.success) {
        const key = parsed.error.issues[0]?.message;
        return {
          message: key ? t(key) : t('messages.invalidInput'),
          type: 'error',
        };
      }

      try {
        const result = await updateProfile(parsed.data);
        updateUser(result.user);
        return { message: t('messages.profileUpdated'), type: 'success' };
      } catch (err) {
        const apiError = err as ApiError;
        return {
          message: apiError.message || t('messages.profileFailed'),
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

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      await deleteAccount();
      toast.success(t('messages.accountDeleted'));
      setShowDeleteDialog(false);
      logout();
    } catch (err) {
      const apiError = err as ApiError;
      toast.error(apiError.message || t('messages.accountDeleteFailed'));
      setIsDeleting(false);
    }
  };

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
    isDeleting,
    showDeleteDialog,
    setShowDeleteDialog,
    handleDeleteAccount,
  };
}
