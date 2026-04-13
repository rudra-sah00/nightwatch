'use client';

import { Loader2 } from 'lucide-react';
import { CreatorFooter } from '@/components/creator-footer';
import { PasswordInfo } from '@/components/ui/password-info';
import { useChangePasswordForm } from '../hooks/use-change-password-form';
import { useProfileOverview } from '../hooks/use-profile-overview';
import { ActivityGraph } from './activity-graph';
import { AppPreferences } from './app-preferences';
import { UpdateProfileForm } from './update-profile-form';

export function ProfileOverview() {
  const { user, activity, loadingActivity } = useProfileOverview();

  const passwordForm = useChangePasswordForm();

  const userCreatedAtDate = user?.createdAt
    ? new Date(user.createdAt)
    : undefined;

  if (!user) return null;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-12 animate-in fade-in zoom-in-95 duration-300 w-full overflow-x-hidden md:overflow-x-visible">
      <UpdateProfileForm />

      <AppPreferences />

      {/* Password Update */}
      <form
        action={passwordForm.action}
        className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-8 "
      >
        <h2 className="text-4xl font-black font-headline uppercase tracking-tighter mb-8">
          Security / Password
        </h2>

        <div className="space-y-8 max-w-2xl">
          {/* Current */}
          <div className="flex flex-col gap-2">
            <span className="font-headline font-bold uppercase tracking-widest text-muted-foreground text-sm">
              Target Authorization
            </span>
            <input
              type="password"
              name="current"
              value={passwordForm.currentPassword}
              onChange={(e) => passwordForm.setCurrentPassword(e.target.value)}
              placeholder="CURRENT PASSWORD"
              required
              className="w-full bg-transparent border-none outline-none text-xl sm:text-4xl font-black font-headline uppercase text-foreground placeholder:text-muted-foreground/30 border-b-2 rounded-md border-border/50 focus:border-primary focus:bg-primary focus:text-primary-foreground transition-colors py-2"
            />
          </div>

          {/* New */}
          <div className="flex flex-col gap-2 relative">
            <div className="flex justify-between items-center">
              <span className="font-headline font-bold uppercase tracking-widest text-muted-foreground text-sm">
                New Key
              </span>
              <PasswordInfo className="text-muted-foreground" />
            </div>
            <input
              type="password"
              name="new"
              value={passwordForm.newPassword}
              onChange={(e) => passwordForm.setNewPassword(e.target.value)}
              placeholder="NEW PASSWORD"
              required
              className="w-full bg-transparent border-none outline-none text-xl sm:text-4xl font-black font-headline uppercase text-foreground placeholder:text-muted-foreground/30 border-b-2 rounded-md border-border/50 focus:border-destructive focus:bg-destructive/10 focus:text-destructive transition-colors py-2"
            />
          </div>

          {/* Confirm */}
          <div className="flex flex-col gap-2 relative">
            <span className="font-headline font-bold uppercase tracking-widest text-muted-foreground text-sm">
              Verify Key
            </span>
            <input
              type="password"
              name="confirm"
              value={passwordForm.confirmPassword}
              onChange={(e) => passwordForm.setConfirmPassword(e.target.value)}
              placeholder="CONFIRM NEW PASSWORD"
              required
              className="w-full bg-transparent border-none outline-none text-xl sm:text-4xl font-black font-headline uppercase text-foreground placeholder:text-muted-foreground/30 border-b-2 rounded-md border-border/50 focus:border-destructive focus:bg-destructive/10 focus:text-destructive transition-colors py-2"
            />
          </div>

          {passwordForm.newPassword && (
            <div className="pt-4 animate-in fade-in slide-in-from-bottom-2">
              <button
                type="submit"
                disabled={passwordForm.isPending}
                className="w-full py-3 mt-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 text-base sm:text-lg"
              >
                {passwordForm.isPending ? (
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                ) : (
                  'OVERRIDE PASSWORD'
                )}
              </button>
            </div>
          )}
        </div>
      </form>

      {/* Watch Activity Heatmap */}
      <section className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-8 overflow-x-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <h2 className="text-4xl font-black font-headline uppercase tracking-tighter">
            Watch Activity
          </h2>
          <div className="flex gap-2 items-center">
            <span className="text-xs font-bold uppercase font-headline text-muted-foreground">
              Less
            </span>
            <div className="w-4 h-4 bg-muted"></div>
            <div className="w-4 h-4 bg-primary/30"></div>
            <div className="w-4 h-4 bg-primary/60"></div>
            <div className="w-4 h-4 bg-primary"></div>
            <div className="w-4 h-4 bg-destructive"></div>
            <span className="text-xs font-bold uppercase font-headline text-muted-foreground">
              More
            </span>
          </div>
        </div>

        <ActivityGraph
          activity={activity}
          createdAt={userCreatedAtDate}
          isLoading={loadingActivity}
        />
      </section>

      <CreatorFooter isCompact={false} />
    </main>
  );
}
