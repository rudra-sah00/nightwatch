'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { changePassword } from '../api';
import { changePasswordSchema } from '../schema';

export function useChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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

  useEffect(() => {
    if (state) {
      if (state.type === 'success') {
        toast.success(state.message);
        setSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else if (state.type === 'error') {
        setError(state.message);
        toast.error(state.message);
      }
    }
  }, [state]);

  return {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    error,
    success,
    action,
    isPending,
  };
}
