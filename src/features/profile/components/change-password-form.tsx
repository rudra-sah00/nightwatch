'use client';

import { AlertCircle, CheckCircle2 } from 'lucide-react';
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
    <form action={action} className="space-y-5">
      {/* Current */}
      <div className="space-y-2">
        <Label
          htmlFor="current"
          className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wider"
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
          className="h-11 rounded-xl bg-white/[0.03] border-white/[0.08] focus:border-indigo-500/30 focus:ring-indigo-500/20"
        />
      </div>

      {/* New */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="new"
            className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wider"
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
          className="h-11 rounded-xl bg-white/[0.03] border-white/[0.08] focus:border-indigo-500/30 focus:ring-indigo-500/20"
        />
        <PasswordStrengthIndicator password={newPassword} />
      </div>

      {/* Confirm */}
      <div className="space-y-2">
        <Label
          htmlFor="confirm"
          className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wider"
        >
          Confirm Password
        </Label>
        <Input
          type="password"
          id="confirm"
          name="confirm"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="h-11 rounded-xl bg-white/[0.03] border-white/[0.08] focus:border-indigo-500/30 focus:ring-indigo-500/20"
        />
      </div>

      {/* Feedback */}
      {error ? (
        <div className="flex items-center gap-2.5 p-3.5 text-sm bg-destructive/10 text-destructive rounded-xl border border-destructive/15">
          <AlertCircle aria-label="Error icon" className="w-4 h-4 shrink-0" />
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="flex items-center gap-2.5 p-3.5 text-sm bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/15">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Password updated
        </div>
      ) : null}

      <Button
        type="submit"
        isLoading={isPending}
        disabled={isPending}
        className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors disabled:opacity-40"
      >
        Update Password
      </Button>
    </form>
  );
}
