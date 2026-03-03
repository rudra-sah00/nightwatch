'use client';

import { AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForgotPasswordForm } from '@/features/auth/hooks/use-forgot-password-form';
import { cn } from '@/lib/utils';

export function ForgotPasswordForm() {
  const {
    isLoading,
    error,
    success,
    formData,
    fieldErrors,
    handleChange,
    handleSubmit,
  } = useForgotPasswordForm();

  if (success) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-full flex items-center justify-center mx-auto text-success">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-semibold">Check your email</h2>
          <p className="text-sm text-muted-foreground">
            We sent a password reset link to{' '}
            <span className="font-medium text-foreground">
              {formData.email}
            </span>
            .
          </p>
        </div>

        <Button
          asChild
          className="w-full text-base font-semibold"
          variant="outline"
        >
          <Link href="/login">Back to Login</Link>
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
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          name="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleChange}
          error={fieldErrors.email}
          autoComplete="email"
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
        Send Reset Link
      </Button>

      <Button type="button" variant="ghost" className="w-full" asChild>
        <Link href="/login">Back to Login</Link>
      </Button>
    </form>
  );
}
