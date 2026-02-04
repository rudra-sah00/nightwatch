'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInfo } from '@/components/ui/password-info';
import { changePassword } from '../api';

export function ChangePasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      const msg = 'New passwords do not match';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (newPassword.length < 6) {
      const msg = 'Password must be at least 6 characters';
      setError(msg);
      toast.error(msg);
      return;
    }

    try {
      setIsLoading(true);
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to update password');
      toast.error(error.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      <div className="space-y-3">
        <Label
          htmlFor="current"
          className="text-sm font-medium text-foreground/90"
        >
          Current Password
        </Label>
        <Input
          type="password"
          id="current"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          className="h-12 px-4 rounded-xl bg-white/[0.03] border-white/[0.08] focus:border-red-500/30 focus:ring-red-500/20 transition-all"
        />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="new"
            className="text-sm font-medium text-foreground/90"
          >
            New Password
          </Label>
          <PasswordInfo />
        </div>
        <Input
          type="password"
          id="new"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          className="h-12 px-4 rounded-xl bg-white/[0.03] border-white/[0.08] focus:border-red-500/30 focus:ring-red-500/20 transition-all"
        />
      </div>
      <div className="space-y-3">
        <Label
          htmlFor="confirm"
          className="text-sm font-medium text-foreground/90"
        >
          Confirm New Password
        </Label>
        <Input
          type="password"
          id="confirm"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="h-12 px-4 rounded-xl bg-white/[0.03] border-white/[0.08] focus:border-red-500/30 focus:ring-red-500/20 transition-all"
        />
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 text-sm text-destructive bg-destructive/10 rounded-2xl border border-destructive/20">
          <span className="flex-shrink-0 p-1 rounded-full bg-destructive/20">
            <svg
              className="w-3 h-3"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-label="Error"
              role="img"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 p-4 text-sm text-emerald-400 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
          <span className="flex-shrink-0 p-1 rounded-full bg-emerald-500/20">
            <svg
              className="w-3 h-3"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-label="Success"
              role="img"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          Password updated successfully
        </div>
      )}

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full h-12 rounded-xl bg-gradient-to-r from-red-500/90 to-red-600/90 hover:from-red-500 hover:to-red-600 text-white font-medium shadow-lg shadow-red-500/20 hover:shadow-red-500/30 transition-all disabled:opacity-50 disabled:shadow-none"
      >
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Update Password
      </Button>
    </form>
  );
}
