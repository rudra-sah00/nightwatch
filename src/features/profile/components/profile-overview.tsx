'use client';

import {
  Calendar,
  Camera,
  ChevronRight,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  Settings,
  User as UserIcon,
} from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useProfileOverview } from '../hooks/use-profile-overview';
import { ActivityGraph } from './activity-graph';

// ─── Profile Overview ────────────────────────────────────────────────────────

export function ProfileOverview() {
  const {
    user,
    logout,
    activity,
    loadingActivity,
    isUploading,
    displayImage,
    fileInputRef,
    formattedJoinDate,
    handleFileClick,
    handleFileChange,
  } = useProfileOverview();

  const userCreatedAtDate = user?.createdAt
    ? new Date(user.createdAt)
    : undefined;

  if (!user) return null;

  return (
    <div className="pb-16">
      <div className="mx-auto max-w-2xl px-4 pt-6 sm:pt-10 space-y-6 sm:space-y-8">
        {/* ── Profile Card ── */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6">
            {/* Avatar */}
            <div className="relative group shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full p-0.5 bg-gradient-to-br from-indigo-500/30 to-indigo-600/20">
                <div className="w-full h-full rounded-full bg-background p-0.5">
                  <Avatar
                    src={displayImage}
                    alt={user.name}
                    className="w-full h-full rounded-full object-cover"
                    fallback={
                      <UserIcon className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground/40" />
                    }
                  />
                </div>
                {isUploading ? (
                  <div className="absolute inset-0.5 flex items-center justify-center rounded-full bg-black/70">
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleFileClick}
                className="absolute inset-0.5 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="w-4 h-4 text-white/80" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 text-center sm:text-left space-y-1.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                {user.name}
              </h1>
              {user.username ? (
                <p className="text-sm text-muted-foreground font-medium">
                  @{user.username}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-muted-foreground/60 pt-1">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3 h-3" />
                  <span className="truncate max-w-[180px]">{user.email}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  Joined {formattedJoinDate}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Activity Graph ── */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-6">
          <div className="flex items-baseline gap-2 mb-4">
            <h2 className="text-sm font-semibold text-foreground/90">
              Watch Activity
            </h2>
            <span className="text-[11px] text-muted-foreground/40">
              past year
            </span>
          </div>
          <ActivityGraph
            activity={activity}
            createdAt={userCreatedAtDate}
            isLoading={loadingActivity}
          />
        </section>

        {/* ── Settings Links ── */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden divide-y divide-white/[0.04]">
          <Link
            href="/settings/profile"
            className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors"
          >
            <div className="p-2 rounded-xl bg-indigo-500/10">
              <Settings className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                Edit Profile
              </p>
              <p className="text-xs text-muted-foreground/60">
                Name, username, server
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
          </Link>
          <Link
            href="/settings/security"
            className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors"
          >
            <div className="p-2 rounded-xl bg-amber-500/10">
              <KeyRound className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Security</p>
              <p className="text-xs text-muted-foreground/60">
                Change password
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
          </Link>
        </section>

        {/* ── Sign Out ── */}
        <Button
          variant="ghost"
          className="w-full text-destructive/70 hover:text-destructive hover:bg-destructive/5 rounded-xl border border-white/[0.06] h-11 text-sm"
          onClick={logout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
