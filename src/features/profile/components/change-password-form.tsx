'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInfo } from '@/components/ui/password-info';
import { PasswordStrengthIndicator } from '@/components/ui/password-strength';
import { useChangePasswordForm } from '../hooks/use-change-password-form';

export function ChangePasswordForm() {
  const {
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
  } = useChangePasswordForm();

  return (
    <form action={action} className="space-y-6 max-w-md">
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
          name="current"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          className="h-12 px-4 rounded-xl bg-white/[0.03] border-white/[0.08] focus:border-indigo-500/30 focus:ring-indigo-500/20 transition-colors"
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
          name="new"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          className="h-12 px-4 rounded-xl bg-white/[0.03] border-white/[0.08] focus:border-indigo-500/30 focus:ring-indigo-500/20 transition-colors"
        />
        <PasswordStrengthIndicator password={newPassword} />
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
          name="confirm"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="h-12 px-4 rounded-xl bg-white/[0.03] border-white/[0.08] focus:border-indigo-500/30 focus:ring-indigo-500/20 transition-colors"
        />
      </div>

      {error ? (
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
      ) : null}
      {success ? (
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
      ) : null}

      <Button
        type="submit"
        isLoading={isPending}
        disabled={isPending}
        className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-500/90 to-indigo-600/90 hover:from-indigo-500 hover:to-indigo-600 text-white font-medium shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-[colors,shadow] disabled:opacity-50 disabled:shadow-none"
      >
        Update Password
      </Button>
    </form>
  );
}
