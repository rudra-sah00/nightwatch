'use client';

/**
 * User Profile Page
 * Premium OLED Dark Design with Tailwind CSS
 */

import {
  Activity,
  Calendar,
  Clock,
  Flame,
  Shield,
  TrendingUp,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AuthGuard } from '@/components/auth';
import { ChangePasswordForm, ContributionGraph, ProfileSettingsForm } from '@/components/profile';
import { Button, Skeleton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import type { UserProfile, WatchActivitySummary } from '@/services/api/user';
import { formatWatchTimeDetailed, getUserProfile, getWatchActivity } from '@/services/api/user';

// Skeleton Loading Component with smooth transitions
function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-in fade-in duration-300">
        {/* Header Skeleton */}
        <div className="relative flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-8 mb-8 sm:mb-12 pb-6 border-b border-white/10">
          {/* Avatar Skeleton */}
          <div className="relative">
            <Skeleton className="w-24 h-24 sm:w-28 sm:h-28 rounded-full" />
            <div className="absolute inset-[-8px] rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-xl -z-10" />
          </div>

          {/* User Details Skeleton */}
          <div className="flex flex-col items-center sm:items-start gap-2 sm:gap-3">
            <Skeleton className="w-40 sm:w-56 h-8 sm:h-10 rounded-lg" />
            <Skeleton className="w-28 sm:w-36 h-5 rounded-md" />
            <Skeleton className="w-24 sm:w-32 h-4 rounded-md" />
          </div>

          {/* Close Button Skeleton */}
          <Skeleton className="absolute top-0 right-0 w-10 h-10 rounded-full hidden sm:block" />
        </div>

        {/* Tabs Skeleton */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-24 sm:w-28 rounded-lg flex-shrink-0" />
          ))}
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-10 sm:mb-12">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 sm:p-5 bg-white/[0.03] border border-white/5 rounded-2xl">
              <Skeleton className="w-10 h-10 rounded-xl mb-4" />
              <Skeleton className="w-20 sm:w-24 h-6 rounded-md mb-2" />
              <Skeleton className="w-16 sm:w-20 h-4 rounded-md" />
            </div>
          ))}
        </div>

        {/* Graph Section Skeleton */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="w-32 h-6 rounded-md" />
            <Skeleton className="w-24 h-6 rounded-full" />
          </div>
          <Skeleton className="h-40 sm:h-52 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

function ProfilePageContent() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activity, setActivity] = useState<WatchActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'security'>('overview');
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [profileData, activityData] = await Promise.all([getUserProfile(), getWatchActivity()]);
      setProfile(profileData);
      setActivity(activityData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleProfileUpdate = () => {
    // Refresh local profile data
    getUserProfile().then(setProfile);
    // Refresh global auth user (for header/badge)
    refreshUser();
  };

  // Show skeleton during loading
  if (loading) {
    return <ProfileSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center space-y-4 animate-in fade-in duration-300">
          <h2 className="text-xl font-semibold text-red-500">Something went wrong</h2>
          <p className="text-zinc-400">{error}</p>
          <Button onClick={() => router.push('/')}>Return Home</Button>
        </div>
      </div>
    );
  }

  const stats = profile?.stats;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Profile Header */}
        <header className="relative flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-8 mb-8 sm:mb-12 pb-6 border-b border-white/10">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-2xl sm:text-4xl font-bold text-white relative z-10 border-4 border-black overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]">
              <span className="relative z-[1]">
                {profile?.name
                  ? profile.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)
                  : profile?.username.slice(0, 2).toUpperCase()}
              </span>
              {profile?.avatar_url && (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="absolute inset-0 w-full h-full object-cover z-[3] rounded-full"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
            </div>
            <div className="absolute inset-[-8px] rounded-full bg-gradient-to-br from-blue-500 to-purple-500 blur-[25px] opacity-40 z-[1]" />
          </div>

          {/* User Details */}
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              {profile?.name || profile?.username}
            </h1>
            <p className="text-base sm:text-lg text-zinc-400 mt-1">@{profile?.username}</p>
            <div className="text-xs sm:text-sm text-zinc-600 mt-2">
              Joined{' '}
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })
                : 'recently'}
            </div>
          </div>

          {/* Close Button */}
          <button
            type="button"
            className="absolute top-0 right-0 sm:flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white hover:scale-105 transition-all duration-200 hidden"
            onClick={() => router.push('/')}
            aria-label="Close"
          >
            <X size={20} />
          </button>

          {/* Mobile Close Button - Top Right Fixed */}
          <button
            type="button"
            className="sm:hidden fixed top-4 right-4 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-zinc-900/90 border border-white/10 text-zinc-400 hover:bg-zinc-800 hover:text-white active:scale-95 transition-all duration-200"
            onClick={() => router.push('/')}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </header>

        {/* Tabs */}
        <div className="mb-6 sm:mb-8 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
          <div className="flex gap-1 sm:gap-2 min-w-max sm:min-w-0">
            <button
              type="button"
              className={`relative flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-[15px] font-medium transition-all duration-200 rounded-lg ${
                activeTab === 'overview'
                  ? 'text-white bg-white/10'
                  : 'text-zinc-500 hover:text-white hover:bg-white/5'
              }`}
              onClick={() => setActiveTab('overview')}
            >
              <Activity size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span>Overview</span>
            </button>
            <button
              type="button"
              className={`relative flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-[15px] font-medium transition-all duration-200 rounded-lg ${
                activeTab === 'profile'
                  ? 'text-white bg-white/10'
                  : 'text-zinc-500 hover:text-white hover:bg-white/5'
              }`}
              onClick={() => setActiveTab('profile')}
            >
              <UserIcon size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span>Profile</span>
            </button>
            <button
              type="button"
              className={`relative flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-[15px] font-medium transition-all duration-200 rounded-lg ${
                activeTab === 'security'
                  ? 'text-white bg-white/10'
                  : 'text-zinc-500 hover:text-white hover:bg-white/5'
              }`}
              onClick={() => setActiveTab('security')}
            >
              <Shield size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span>Security</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <main>
          {activeTab === 'overview' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-10 sm:mb-12">
                <div className="p-4 sm:p-5 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.05] transition-colors duration-200">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3 sm:mb-4">
                    <Clock size={20} />
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-white">
                    {formatWatchTimeDetailed(stats?.total_watch_time_seconds || 0)}
                  </div>
                  <div className="text-xs sm:text-sm text-zinc-400 mt-1">Total Watch Time</div>
                </div>

                <div className="p-4 sm:p-5 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.05] transition-colors duration-200">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3 sm:mb-4">
                    <Calendar size={20} />
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-white">
                    {stats?.total_days_active || 0} days
                  </div>
                  <div className="text-xs sm:text-sm text-zinc-400 mt-1">Days Active</div>
                </div>

                <div className="p-4 sm:p-5 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.05] transition-colors duration-200">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center mb-3 sm:mb-4">
                    <Flame size={20} />
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-white">
                    {stats?.current_streak || 0} days
                  </div>
                  <div className="text-xs sm:text-sm text-zinc-400 mt-1">Current Streak</div>
                </div>

                <div className="p-4 sm:p-5 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.05] transition-colors duration-200">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 sm:mb-4">
                    <TrendingUp size={20} />
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-white">
                    {stats?.longest_streak || 0} days
                  </div>
                  <div className="text-xs sm:text-sm text-zinc-400 mt-1">Longest Streak</div>
                </div>
              </div>

              {/* Contribution Graph Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-semibold">Watch Activity</h2>
                  <span className="text-xs px-3 py-1.5 bg-white/5 rounded-full text-zinc-400">
                    Last 365 Days
                  </span>
                </div>
                <ContributionGraph activities={activity?.activities || []} />
              </section>
            </div>
          )}

          {activeTab === 'profile' && profile && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <ProfileSettingsForm initialData={profile} onUpdate={handleProfileUpdate} />
            </div>
          )}

          {activeTab === 'security' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <ChangePasswordForm />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfilePageContent />
    </AuthGuard>
  );
}
