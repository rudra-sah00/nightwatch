'use client';

import { useTranslations } from 'next-intl';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { changePassword } from '../api';
import { changePasswordSchema } from '../schema';

/**
 * Hook that manages the change-password form state and submission logic.
 *
 * Validates input against {@link changePasswordSchema}, calls the
 * `changePassword` API, and displays success/error toasts. Form fields
 * are reset on a successful password change.
 *
 * @returns Form field values, their setters, the form `action` for
 *          `useActionState`, and an `isPending` flag.
 */
export function useChangePasswordForm() {
  const t = useTranslations('profile');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [state, action, isPending] = React.useActionState(
    async (
      _prevState: { message: string; type: string } | null,
      formData: FormData,
    ) => {
      const currentPassword = formData.get('current') as string;
      const newPassword = formData.get('new') as string;
      const confirmPassword = formData.get('confirm') as string;

      const parsed = changePasswordSchema.safeParse({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (!parsed.success) {
        const key = parsed.error.issues[0]?.message;
        return {
          message: key ? t(key) : t('messages.invalidInput'),
          type: 'error',
        };
      }

      try {
        const { currentPassword, newPassword } = parsed.data;
        await changePassword({ currentPassword, newPassword });
        return { message: t('messages.passwordUpdated'), type: 'success' };
      } catch (err) {
        const error = err as Error;
        return {
          message: error.message || t('messages.passwordFailed'),
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
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else if (state.type === 'error') {
      toast.error(state.message);
    }
  }, [state, isPending]);

  return {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    action,
    isPending,
  };
}
