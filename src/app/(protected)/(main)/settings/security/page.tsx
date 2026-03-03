'use client';

import { KeyRound } from 'lucide-react';
import { ChangePasswordForm } from '@/features/profile/components/change-password-form';

export default function SettingsSecurityPage() {
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/15 to-indigo-600/5 border border-indigo-500/10">
          <KeyRound className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Security
          </h1>
          <p className="text-sm text-muted-foreground/70 mt-0.5">
            Update your password and secure your account
          </p>
        </div>
      </div>

      {/* Separator */}
      <div className="h-px bg-gradient-to-r from-border/50 via-border/30 to-transparent" />

      {/* Form */}
      <ChangePasswordForm />
    </div>
  );
}
