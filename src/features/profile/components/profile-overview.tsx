'use client';

import {
  ArrowRight,
  Calendar,
  Camera,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  User as UserIcon,
} from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useProfileOverview } from '../hooks/use-profile-overview';
import { ActivityGraph } from './activity-graph';

// ─── Action Card ─────────────────────────────────────────────────────────────

interface ActionCardProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function ActionCard({ href, icon, title, description }: ActionCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group relative flex items-center gap-4 p-5 rounded-2xl',
        'bg-white/[0.02] border border-white/[0.06]',
        'hover:bg-white/[0.04] hover:border-white/[0.12]',
        'transition-[colors,opacity] duration-300',
      )}
    >
      <div
        className={cn(
          'p-3 rounded-xl',
          'bg-gradient-to-br from-indigo-500/15 to-indigo-600/5',
          'border border-indigo-500/10',
          'group-hover:from-indigo-500/20 group-hover:to-indigo-600/10',
          'transition-colors duration-300',
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-foreground group-hover:text-white transition-colors">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground/70 mt-0.5">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-[colors,transform] duration-300" />
    </Link>
  );
}

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
    <div className="min-h-screen pb-12">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="container max-w-3xl mx-auto px-4 h-14 flex items-center">
          <Link
            href="/home"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </Link>
        </div>
      </div>

      <div className="container max-w-3xl mx-auto px-4 pt-10 space-y-10">
        {/* ── Hero Section ── */}
        <section className="flex flex-col items-center text-center space-y-5">
          {/* Avatar */}
          <div className="relative group">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-indigo-500/20 via-blue-500/20 to-indigo-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative w-28 h-28 rounded-full p-0.5 bg-gradient-to-br from-indigo-500/30 via-blue-500/20 to-indigo-600/30 shadow-xl shadow-indigo-500/10">
              <div className="w-full h-full rounded-full bg-background p-0.5">
                <Avatar
                  src={displayImage}
                  alt={user.name}
                  className="w-full h-full rounded-full object-cover"
                  fallback={
                    <UserIcon className="w-12 h-12 text-muted-foreground/40" />
                  }
                />
              </div>
              {isUploading ? (
                <div className="absolute inset-1 flex items-center justify-center rounded-full bg-black/70 backdrop-blur-sm">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleFileClick}
              className="absolute inset-1 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
            >
              <Camera className="w-5 h-5 text-white/80" />
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

          {/* Name & Meta */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {user.name}
            </h1>
            <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground/70">
              {user.username ? (
                <span className="font-medium">@{user.username}</span>
              ) : null}
              {user.username ? <span className="w-px h-3.5 bg-border" /> : null}
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {user.email}
              </span>
            </div>
            <p className="text-xs text-muted-foreground/50 flex items-center justify-center gap-1.5">
              <Calendar className="w-3 h-3" />
              Joined {formattedJoinDate}
            </p>
          </div>
        </section>

        {/* ── Activity Graph ── */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-5 md:p-6">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-base font-semibold text-foreground/90">
              Watch Activity
            </h2>
            <span className="text-xs text-muted-foreground/50">
              Your viewing over the past year
            </span>
          </div>
          <ActivityGraph
            activity={activity}
            createdAt={userCreatedAtDate}
            isLoading={loadingActivity}
          />
        </section>

        {/* ── Quick Actions ── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ActionCard
            href="/settings/profile"
            icon={<UserIcon className="w-5 h-5 text-indigo-400" />}
            title="Edit Profile"
            description="Name, username, server preference"
          />
          <ActionCard
            href="/settings/security"
            icon={<KeyRound className="w-5 h-5 text-indigo-400" />}
            title="Security"
            description="Update your password"
          />
        </section>

        {/* ── Sign Out ── */}
        <div className="pt-2">
          <Button
            variant="ghost"
            className="w-full text-destructive/80 hover:text-destructive hover:bg-destructive/5 rounded-xl border border-destructive/10 hover:border-destructive/20 transition-colors h-11"
            onClick={logout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
