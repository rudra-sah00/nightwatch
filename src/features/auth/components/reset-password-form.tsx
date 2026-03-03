'use client';

import { AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordStrengthIndicator } from '@/components/ui/password-strength';
import { useResetPasswordForm } from '@/features/auth/hooks/use-reset-password-form';
import { cn } from '@/lib/utils';

type ResetPasswordFormProps = {
  token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const {
    isLoading,
    error,
    success,
    formData,
    fieldErrors,
    handleChange,
    handleSubmit,
  } = useResetPasswordForm(token);

  if (success) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-full flex items-center justify-center mx-auto text-success">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-semibold">Password Reset Complete</h2>
          <p className="text-sm text-muted-foreground">
            You can now log in with your new password. Redirecting to login...
          </p>
        </div>

        <Button asChild className="w-full text-base font-semibold">
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg p-3 text-sm border bg-destructive/15 text-destructive border-destructive/20',
          )}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="password">New Password</Label>
        <Input
          id="password"
          type="password"
          name="password"
          placeholder="••••••••"
          value={formData.password}
          onChange={handleChange}
          error={fieldErrors.password}
          autoComplete="new-password"
          disabled={isLoading}
          className="bg-secondary/50"
        />
        <PasswordStrengthIndicator password={formData.password} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          name="confirmPassword"
          placeholder="••••••••"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={fieldErrors.confirmPassword}
          autoComplete="new-password"
          disabled={isLoading}
          className="bg-secondary/50"
        />
      </div>

      <Button
        type="submit"
        size="lg"
        isLoading={isLoading}
        disabled={isLoading}
        className="w-full text-base font-semibold mt-2"
      >
        Reset Password
      </Button>

      <Button type="button" variant="ghost" className="w-full" asChild>
        <Link href="/login">Back to Login</Link>
      </Button>
    </form>
  );
}
