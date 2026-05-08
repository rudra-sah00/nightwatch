'use client';

import { Calendar, Home, User } from 'lucide-react';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { useMemo } from 'react';
import type { ActivityData } from '../types';
import { ActivityGraph } from './activity-graph';

/** Props for the {@link PublicProfileView} component. */
interface PublicProfileViewProps {
  /** Public profile data including user info and watch activity. */
  profile: {
    id: string;
    name: string;
    username: string | null;
    profilePhoto: string | null;
    createdAt: string;
    activity: { date: string; watchSeconds: number }[];
    musicActivity: { date: string; listenSeconds: number }[];
  };
  /** Pre-computed today's date (ISO string) from server to prevent hydration mismatch. */
  todayIso: string;
}

/**
 * Read-only public profile page displaying a user's avatar, stats (streak and
 * total watch hours), and a GitHub-style activity heatmap. Includes a link
 * back to the home page.
 */
export function PublicProfileView({
  profile,
  todayIso,
}: PublicProfileViewProps) {
  const t = useTranslations('profile');
  const format = useFormatter();
  const joinDate = format.dateTime(new Date(profile.createdAt), {
    month: 'long',
    year: 'numeric',
  });

  // Map API activity to Heatmap component expectations
  const mappedActivity = useMemo(() => {
    const watch: ActivityData['watch'] = profile.activity.map((a) => {
      const minutes = Math.floor(a.watchSeconds / 60);
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (minutes > 0) {
        if (minutes > 120) level = 4;
        else if (minutes > 60) level = 3;
        else if (minutes > 30) level = 2;
        else level = 1;
      }
      return { date: a.date, count: minutes, level };
    });

    const music: ActivityData['music'] = profile.musicActivity.map((a) => {
      const minutes = Math.floor(a.listenSeconds / 60);
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (minutes > 0) {
        if (minutes > 120) level = 4;
        else if (minutes > 60) level = 3;
        else if (minutes > 30) level = 2;
        else level = 1;
      }
      return { date: a.date, count: minutes, level };
    });

    return { watch, music };
  }, [profile.activity, profile.musicActivity]);

  // Calculate accurate activity streak (consecutive days with any activity)
  const watchStreak = computeStreak(
    profile.activity,
    profile.musicActivity,
    todayIso,
  );
  const totalWatchHours = Math.floor(
    profile.activity.reduce((acc, curr) => acc + curr.watchSeconds, 0) / 3600,
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-background text-foreground selection:bg-neo-yellow selection:text-foreground">
      {/* Background patterns / abstract shapes for premium look */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full border-[100px] border-border" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] border-[80px] border-border rotate-45" />
      </div>

      <div className="container max-w-5xl mx-auto px-4 py-20 relative z-10">
        {/* Header Navigation */}
        <div className="mb-12 flex justify-between items-center">
          <Link
            href="/"
            className="group flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground border-[3px] border-border transition-colors duration-200 uppercase font-headline font-bold text-sm tracking-tight hover:bg-primary/90"
          >
            <Home className="w-4 h-4" />
            <span>{t('publicProfile.returnBase')}</span>
          </Link>
          <div className="hidden md:block bg-neo-yellow border-[3px] border-border px-5 py-2  font-headline font-black uppercase text-sm tracking-widest">
            {t('publicProfile.identityVerified')}
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-card border-[4px] border-border  p-8 lg:p-12 mb-12">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 lg:gap-12 text-center md:text-left">
            {/* Avatar Section */}
            <div className="relative group shrink-0">
              <div className="absolute inset-0 bg-neo-yellow translate-x-1.5 translate-y-1.5 border-[4px] border-border" />
              <div className="relative w-32 h-32 md:w-44 md:h-44 bg-card border-[4px] border-border flex items-center justify-center overflow-hidden">
                {profile.profilePhoto ? (
                  <img
                    src={profile.profilePhoto}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-16 h-16 md:w-20 md:h-20 text-foreground/20" />
                )}
              </div>
            </div>

            {/* User Info Section */}
            <div className="flex-1 space-y-4">
              <div className="inline-block bg-primary text-primary-foreground px-3 py-1 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mb-2 leading-none border-[3px] border-border">
                {t('publicProfile.persistentIdentity', {
                  id: `${profile.id.slice(0, 8)}...`,
                })}
              </div>
              <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none break-words">
                {profile.name}
              </h1>
              <p className="text-xl md:text-2xl font-bold text-foreground/40 font-headline uppercase tracking-tight">
                @{profile.username || t('publicProfile.unknownUser')}
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-8 pt-4">
                <div className="flex items-center gap-2 text-foreground/60 font-headline font-bold text-xs md:text-sm uppercase tracking-widest">
                  <Calendar className="w-4 h-4" />
                  {t('updateForm.joined', { date: joinDate })}
                </div>
              </div>
            </div>

            {/* Quick Stats Bento */}
            <div className="grid grid-cols-2 gap-4 w-full md:w-auto h-fit">
              <div className="bg-neo-blue text-foreground border-[3px] border-border p-4 text-center ">
                <div className="text-2xl font-black mb-1">{watchStreak}</div>
                <div className="text-[10px] uppercase font-black opacity-80">
                  {t('publicProfile.daysActive')}
                </div>
              </div>
              <div className="bg-neo-orange text-foreground border-[3px] border-border p-4 text-center ">
                <div className="text-2xl font-black mb-1">
                  {totalWatchHours}
                </div>
                <div className="text-[10px] uppercase font-black opacity-80">
                  {t('publicProfile.hrsTotal')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Watch Activity Graph Section */}
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-[4px] border-border pb-6">
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">
              {t('activity.title')}
            </h2>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 items-center justify-end">
                <span className="text-[10px] font-bold uppercase font-headline text-muted-foreground w-12 text-right">
                  Watch
                </span>
                <div className="flex gap-1">
                  <div className="w-3 h-3 bg-secondary"></div>
                  <div className="w-3 h-3 bg-activity-1"></div>
                  <div className="w-3 h-3 bg-activity-2"></div>
                  <div className="w-3 h-3 bg-activity-3"></div>
                  <div className="w-3 h-3 bg-activity-4"></div>
                </div>
              </div>
              <div className="flex gap-2 items-center justify-end">
                <span className="text-[10px] font-bold uppercase font-headline text-muted-foreground w-12 text-right">
                  Music
                </span>
                <div className="flex gap-1">
                  <div className="w-3 h-3 bg-secondary"></div>
                  <div className="w-3 h-3 bg-music-1"></div>
                  <div className="w-3 h-3 bg-music-2"></div>
                  <div className="w-3 h-3 bg-music-3"></div>
                  <div className="w-3 h-3 bg-music-4"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border-[4px] border-border  p-6 lg:p-10 overflow-x-auto">
            <div className="min-w-[800px] lg:min-w-0">
              <ActivityGraph activity={mappedActivity} />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-8 pb-12 opacity-50 font-black text-[10px] uppercase tracking-[0.2em]">
            <div className="flex items-center gap-4">
              <span>{t('publicProfile.userIdentity', { id: profile.id })}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>{t('publicProfile.coreVersion')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Computes the consecutive-day watch streak ending at today (or yesterday).
 *
 * @param activity - Array of daily activity records with `date` and `watchSeconds`.
 * @param todayIso - Today's date as an ISO string (`YYYY-MM-DD`).
 * @returns Number of consecutive active days (capped at 365).
 */
function computeStreak(
  watch: { date: string; watchSeconds: number }[],
  music: { date: string; listenSeconds: number }[],
  todayIso: string,
) {
  if (watch.length === 0 && music.length === 0) return 0;

  let streak = 0;
  const activeDates = new Set([
    ...watch.filter((a) => a.watchSeconds > 0).map((a) => a.date),
    ...music.filter((a) => a.listenSeconds > 0).map((a) => a.date),
  ]);

  let currentDate = todayIso;

  if (!activeDates.has(currentDate)) {
    currentDate = addDays(currentDate, -1);
  }

  while (activeDates.has(currentDate)) {
    streak++;
    currentDate = addDays(currentDate, -1);
    if (streak > 365) break;
  }

  return streak;
}

/**
 * Add days to an ISO date string without timezone conversions.
 * Prevents hydration mismatches from Date object behavior.
 */
function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
}
