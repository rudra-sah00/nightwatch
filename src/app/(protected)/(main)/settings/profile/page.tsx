'use client';

import { User as UserIcon } from 'lucide-react';
import { UpdateProfileForm } from '@/features/profile/components/update-profile-form';

export default function SettingsProfilePage() {
  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/15 to-indigo-600/5 border border-indigo-500/10">
          <UserIcon className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Profile
          </h1>
          <p className="text-sm text-muted-foreground/70 mt-0.5">
            Manage your public profile and preferences
          </p>
        </div>
      </div>

      {/* Separator */}
      <div className="h-px bg-gradient-to-r from-border/50 via-border/30 to-transparent" />

      {/* Form */}
      <UpdateProfileForm />
    </div>
  );
}
