'use client';

import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { changePassword } from '../api';
import { changePasswordSchema } from '../schema';

export function useChangePasswordForm() {
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
        return {
          message: parsed.error.issues[0]?.message ?? 'Invalid input',
          type: 'error',
        };
      }

      try {
        const { currentPassword, newPassword } = parsed.data;
        await changePassword({ currentPassword, newPassword });
        return { message: 'Password updated successfully', type: 'success' };
      } catch (err) {
        const error = err as Error;
        return {
          message: error.message || 'Failed to update password',
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
