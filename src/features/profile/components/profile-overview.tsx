'use client';

import { AlertCircle, Loader2 } from 'lucide-react';
import { CreatorFooter } from '@/components/creator-footer';
import { PasswordInfo } from '@/components/ui/password-info';
import { useChangePasswordForm } from '../hooks/use-change-password-form';
import { useProfileOverview } from '../hooks/use-profile-overview';
import { ActivityGraph } from './activity-graph';
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

      {/* Password Update */}
      <form
        action={passwordForm.action}
        className="bg-white text-foreground border border-gray-200 rounded-xl shadow-sm p-8 "
      >
        <h2 className="text-4xl font-black font-headline uppercase tracking-tighter mb-8 text-foreground">
          Security / Password
        </h2>

        <div className="space-y-8 max-w-2xl">
          {/* Current */}
          <div className="flex flex-col gap-2">
            <span className="font-headline font-bold uppercase tracking-widest text-foreground/60 text-sm">
              Target Authorization
            </span>
            <input
              type="password"
              name="current"
              value={passwordForm.currentPassword}
              onChange={(e) => passwordForm.setCurrentPassword(e.target.value)}
              placeholder="CURRENT PASSWORD"
              required
              className="w-full bg-transparent border-none outline-none text-xl sm:text-4xl font-black font-headline uppercase text-foreground placeholder:text-foreground/20 border-b-2 rounded-md border-border/20 focus:border-[blue-600] focus:bg-[blue-600] focus:text-red-900 transition-colors py-2"
            />
          </div>

          {/* New */}
          <div className="flex flex-col gap-2 relative">
            <div className="flex justify-between items-center">
              <span className="font-headline font-bold uppercase tracking-widest text-foreground/60 text-sm">
                New Key
              </span>
              <PasswordInfo className="text-foreground fill-[#1a1a1a]" />
            </div>
            <input
              type="password"
              name="new"
              value={passwordForm.newPassword}
              onChange={(e) => passwordForm.setNewPassword(e.target.value)}
              placeholder="NEW PASSWORD"
              required
              className="w-full bg-transparent border-none outline-none text-xl sm:text-4xl font-black font-headline uppercase text-foreground placeholder:text-foreground/20 border-b-2 rounded-md border-border/20 focus:border-red-500 focus:bg-red-50 focus:text-red-900 transition-colors py-2"
            />
          </div>

          {/* Confirm */}
          <div className="flex flex-col gap-2 relative">
            <span className="font-headline font-bold uppercase tracking-widest text-foreground/60 text-sm">
              Verify Key
            </span>
            <input
              type="password"
              name="confirm"
              value={passwordForm.confirmPassword}
              onChange={(e) => passwordForm.setConfirmPassword(e.target.value)}
              placeholder="CONFIRM NEW PASSWORD"
              required
              className="w-full bg-transparent border-none outline-none text-xl sm:text-4xl font-black font-headline uppercase text-foreground placeholder:text-foreground/20 border-b-2 rounded-md border-border/20 focus:border-red-500 focus:bg-red-50 focus:text-red-900 transition-colors py-2"
            />
          </div>

          {passwordForm.error && (
            <div className="bg-red-50 text-red-600 p-4 border border-red-200 rounded-xl shadow-sm font-bold font-headline uppercase flex gap-2 items-center">
              <AlertCircle /> {passwordForm.error}
            </div>
          )}

          {passwordForm.newPassword && (
            <div className="pt-4 animate-in fade-in slide-in-from-bottom-2">
              <button
                type="submit"
                disabled={passwordForm.isPending}
                className="w-full py-3 mt-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 text-base sm:text-lg"
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
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-8  overflow-x-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <h2 className="text-4xl font-black font-headline uppercase tracking-tighter text-foreground">
            Watch Activity
          </h2>
          <div className="flex gap-2 items-center">
            <span className="text-xs font-bold uppercase font-headline text-foreground">
              Less
            </span>
            <div className="w-4 h-4 bg-[#f1ece4]"></div>
            <div className="w-4 h-4 bg-[#b3ccff]"></div>
            <div className="w-4 h-4 bg-[blue-600]"></div>
            <div className="w-4 h-4 bg-amber-100"></div>
            <div className="w-4 h-4 bg-red-500"></div>
            <span className="text-xs font-bold uppercase font-headline text-foreground">
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
