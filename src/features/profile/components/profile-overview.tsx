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
        className="bg-white text-[#1a1a1a] border-4 border-[#1a1a1a] p-8 neo-shadow"
      >
        <h2 className="text-4xl font-black font-headline uppercase tracking-tighter mb-8 text-[#1a1a1a]">
          Security / Password
        </h2>

        <div className="space-y-8 max-w-2xl">
          {/* Current */}
          <div className="flex flex-col gap-2">
            <span className="font-headline font-bold uppercase tracking-widest text-[#1a1a1a]/60 text-sm">
              Target Authorization
            </span>
            <input
              type="password"
              name="current"
              value={passwordForm.currentPassword}
              onChange={(e) => passwordForm.setCurrentPassword(e.target.value)}
              placeholder="CURRENT PASSWORD"
              required
              className="w-full bg-transparent border-none outline-none text-xl sm:text-4xl font-black font-headline uppercase text-[#1a1a1a] placeholder:text-[#1a1a1a]/20 border-b-8 border-[#1a1a1a]/20 focus:border-[#0055ff] focus:bg-[#0055ff] focus:text-white transition-colors py-2"
            />
          </div>

          {/* New */}
          <div className="flex flex-col gap-2 relative">
            <div className="flex justify-between items-center">
              <span className="font-headline font-bold uppercase tracking-widest text-[#1a1a1a]/60 text-sm">
                New Key
              </span>
              <PasswordInfo className="text-[#1a1a1a] fill-[#1a1a1a]" />
            </div>
            <input
              type="password"
              name="new"
              value={passwordForm.newPassword}
              onChange={(e) => passwordForm.setNewPassword(e.target.value)}
              placeholder="NEW PASSWORD"
              required
              className="w-full bg-transparent border-none outline-none text-xl sm:text-4xl font-black font-headline uppercase text-[#1a1a1a] placeholder:text-[#1a1a1a]/20 border-b-8 border-[#1a1a1a]/20 focus:border-[#e63b2e] focus:bg-[#e63b2e] focus:text-white transition-colors py-2"
            />
          </div>

          {/* Confirm */}
          <div className="flex flex-col gap-2 relative">
            <span className="font-headline font-bold uppercase tracking-widest text-[#1a1a1a]/60 text-sm">
              Verify Key
            </span>
            <input
              type="password"
              name="confirm"
              value={passwordForm.confirmPassword}
              onChange={(e) => passwordForm.setConfirmPassword(e.target.value)}
              placeholder="CONFIRM NEW PASSWORD"
              required
              className="w-full bg-transparent border-none outline-none text-xl sm:text-4xl font-black font-headline uppercase text-[#1a1a1a] placeholder:text-[#1a1a1a]/20 border-b-8 border-[#1a1a1a]/20 focus:border-[#e63b2e] focus:bg-[#e63b2e] focus:text-white transition-colors py-2"
            />
          </div>

          {passwordForm.error && (
            <div className="bg-[#e63b2e] p-4 border-4 border-[#1a1a1a] text-white font-bold font-headline uppercase flex gap-2 items-center">
              <AlertCircle /> {passwordForm.error}
            </div>
          )}

          {passwordForm.newPassword && (
            <div className="pt-4 animate-in fade-in slide-in-from-bottom-2">
              <button
                type="submit"
                disabled={passwordForm.isPending}
                className="w-full py-6 bg-[#1a1a1a] text-[#ffcc00] font-headline font-black uppercase border-4 border-[#1a1a1a] hover:bg-white hover:text-[#1a1a1a] transition-colors neo-shadow-sm active:translate-x-[2px] active:translate-y-[2px] text-2xl sm:text-3xl"
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
      <section className="bg-white border-4 border-[#1a1a1a] p-8 neo-shadow overflow-x-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <h2 className="text-4xl font-black font-headline uppercase tracking-tighter text-[#1a1a1a]">
            Watch Activity
          </h2>
          <div className="flex gap-2 items-center">
            <span className="text-xs font-bold uppercase font-headline text-[#1a1a1a]">
              Less
            </span>
            <div className="w-4 h-4 bg-[#f1ece4]"></div>
            <div className="w-4 h-4 bg-[#b3ccff]"></div>
            <div className="w-4 h-4 bg-[#0055ff]"></div>
            <div className="w-4 h-4 bg-[#ffcc00]"></div>
            <div className="w-4 h-4 bg-[#e63b2e]"></div>
            <span className="text-xs font-bold uppercase font-headline text-[#1a1a1a]">
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
