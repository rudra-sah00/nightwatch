'use client';

import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { CreatorFooter } from '@/components/ui/creator-footer';
import { PasswordInfo } from '@/components/ui/password-info';
import { useChangePasswordForm } from '../hooks/use-change-password-form';
import { useProfileOverview } from '../hooks/use-profile-overview';
import { ActiveDevices } from './active-devices';
import { ActivityGraph } from './activity-graph';
import { AppPreferences } from './app-preferences';
import { UpdateProfileForm } from './update-profile-form';

/**
 * Main profile page layout composing the update form, app preferences,
 * password change form, and watch activity heatmap sections.
 */
export function ProfileOverview() {
  const t = useTranslations('profile');
  const { user, activity, loadingActivity } = useProfileOverview();

  const passwordForm = useChangePasswordForm();
  const [showPasswords, setShowPasswords] = useState(false);

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
          {t('security.title')}
        </h2>

        <div className="space-y-8 max-w-2xl">
          {/* Current */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="current-password"
              className="font-headline font-bold uppercase tracking-widest text-muted-foreground text-sm"
            >
              {t('security.currentPassword')}
            </label>
            <div className="relative">
              <input
                id="current-password"
                type={showPasswords ? 'text' : 'password'}
                name="current"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  passwordForm.setCurrentPassword(e.target.value)
                }
                placeholder={t('security.currentPasswordPlaceholder')}
                required
                className="w-full bg-transparent border-none outline-none text-xl sm:text-4xl font-black font-headline uppercase text-foreground placeholder:text-muted-foreground/30 border-b-2 rounded-md border-border/50 focus:border-primary focus:bg-primary focus:text-primary-foreground transition-colors py-2 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPasswords((p) => !p)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={
                  showPasswords
                    ? t('security.hidePasswords')
                    : t('security.showPasswords')
                }
                tabIndex={-1}
              >
                {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* New */}
          <div className="flex flex-col gap-2 relative">
            <div className="flex justify-between items-center">
              <label
                htmlFor="new-password"
                className="font-headline font-bold uppercase tracking-widest text-muted-foreground text-sm"
              >
                {t('security.newPassword')}
              </label>
              <PasswordInfo className="text-muted-foreground" />
            </div>
            <input
              id="new-password"
              type={showPasswords ? 'text' : 'password'}
              name="new"
              value={passwordForm.newPassword}
              onChange={(e) => passwordForm.setNewPassword(e.target.value)}
              placeholder={t('security.newPasswordPlaceholder')}
              required
              className="w-full bg-transparent border-none outline-none text-xl sm:text-4xl font-black font-headline uppercase text-foreground placeholder:text-muted-foreground/30 border-b-2 rounded-md border-border/50 focus:border-destructive focus:bg-destructive/10 focus:text-destructive transition-colors py-2"
            />
          </div>

          {/* Confirm */}
          <div className="flex flex-col gap-2 relative">
            <label
              htmlFor="confirm-password"
              className="font-headline font-bold uppercase tracking-widest text-muted-foreground text-sm"
            >
              {t('security.confirmPassword')}
            </label>
            <input
              id="confirm-password"
              type={showPasswords ? 'text' : 'password'}
              name="confirm"
              value={passwordForm.confirmPassword}
              onChange={(e) => passwordForm.setConfirmPassword(e.target.value)}
              placeholder={t('security.confirmPasswordPlaceholder')}
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
                  t('security.submit')
                )}
              </button>
            </div>
          )}
        </div>
      </form>

      <ActiveDevices />

      {/* Watch Activity Heatmap */}
      <section
        className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-8"
        aria-label={t('activity.heatmapAriaLabel')}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <h2 className="text-4xl font-black font-headline uppercase tracking-tighter">
            {t('activity.title')}
          </h2>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 items-center">
              <span className="text-[10px] font-bold uppercase font-headline text-muted-foreground w-12">
                Watch
              </span>
              <div className="flex gap-1.5 items-center">
                <div className="w-3.5 h-3.5 bg-secondary"></div>
                <div className="w-3.5 h-3.5 bg-activity-1"></div>
                <div className="w-3.5 h-3.5 bg-activity-2"></div>
                <div className="w-3.5 h-3.5 bg-activity-3"></div>
                <div className="w-3.5 h-3.5 bg-activity-4"></div>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-[10px] font-bold uppercase font-headline text-muted-foreground w-12">
                Music
              </span>
              <div className="flex gap-1.5 items-center">
                <div className="w-3.5 h-3.5 bg-secondary"></div>
                <div className="w-3.5 h-3.5 bg-music-1"></div>
                <div className="w-3.5 h-3.5 bg-music-2"></div>
                <div className="w-3.5 h-3.5 bg-music-3"></div>
                <div className="w-3.5 h-3.5 bg-music-4"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <ActivityGraph
            activity={activity}
            createdAt={userCreatedAtDate}
            isLoading={loadingActivity}
          />
        </div>
      </section>

      <CreatorFooter isCompact={false} />
    </main>
  );
}
