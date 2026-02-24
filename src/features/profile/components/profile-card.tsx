'use client';

import {
  Activity,
  Calendar,
  Camera,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Sparkles,
  User as UserIcon,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { getWatchActivity, uploadProfileImage } from '../api';
import type { WatchActivity } from '../types';
import { ActivityGraph } from './activity-graph';
import { ChangePasswordForm } from './change-password-form';
import { UpdateProfileForm } from './update-profile-form';

// Reusable ProfileSection component with enhanced styling
interface ProfileSectionProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const ProfileSection = ({
  title,
  description,
  icon,
  children,
}: ProfileSectionProps) => (
  <section className="group/section">
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-2xl shadow-2xl shadow-black/10">
      {/* Decorative gradient orb */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-red-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl opacity-0 group-hover/section:opacity-100 transition-opacity duration-700" />

      <div className="relative p-6 lg:p-8 space-y-5">
        {/* Section Header */}
        <div className="flex items-start gap-4">
          {icon ? (
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/20 shadow-lg shadow-red-500/5">
              {icon}
            </div>
          ) : null}
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {title}
            </h2>
            <p className="text-sm text-muted-foreground/80">{description}</p>
          </div>
        </div>

        {/* Separator */}
        <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

        {/* Content */}
        <div className="w-full">{children}</div>
      </div>
    </div>
  </section>
);

// Tab button component with modern styling
interface TabButtonProps {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

const TabButton = ({ isActive, onClick, children, icon }: TabButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-6 lg:px-8 py-2.5 text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      isActive
        ? 'bg-gradient-to-r from-red-500/20 via-red-500/15 to-red-600/10 text-foreground shadow-lg shadow-red-500/10 border border-red-500/20'
        : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.03] border border-transparent',
    )}
  >
    {icon}
    {children}
    {isActive ? (
      <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-red-500/5 to-transparent pointer-events-none" />
    ) : null}
  </button>
);

type TabType = 'overview' | 'settings';

export function ProfileCard() {
  const { user, logout, updateUser } = useAuth();
  const [activity, setActivity] = useState<WatchActivity[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadActivity = () => {
      setLoadingActivity(true);
      getWatchActivity()
        .then(setActivity)
        .catch(() => toast.error('Failed to load activity'))
        .finally(() => setLoadingActivity(false));
    };

    loadActivity();

    const handleFocus = () => {
      getWatchActivity().then(setActivity);
    };

    window.addEventListener('focus', handleFocus, { passive: true });
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handleFileClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Create optimistic preview immediately
      const localPreviewUrl = URL.createObjectURL(file);
      setPreviewImage(localPreviewUrl);

      try {
        setIsUploading(true);
        const { url } = await uploadProfileImage(file);
        // Update user profile photo in auth context
        updateUser({ profilePhoto: url });
        // Clear preview once real URL is set
        setPreviewImage(null);
        toast.success('Profile image updated successfully');
      } catch {
        // Revert preview on error
        setPreviewImage(null);
        toast.error('Failed to upload profile image');
      } finally {
        setIsUploading(false);
        // Clear file input for re-uploads
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        // Cleanup object URL
        URL.revokeObjectURL(localPreviewUrl);
      }
    },
    [updateUser],
  );

  // Use preview image if available, otherwise use user's profile photo
  const displayImage = previewImage || user?.profilePhoto;

  const userCreatedAtDate = useMemo(
    () => (user?.createdAt ? new Date(user.createdAt) : undefined),
    [user?.createdAt],
  );

  const formattedJoinDate = useMemo(
    () =>
      userCreatedAtDate
        ? userCreatedAtDate.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })
        : 'Unknown',
    [userCreatedAtDate],
  );

  if (!user) return null;

  return (
    <div className="relative min-h-screen pt-20 lg:pt-24 pb-12">
      {/* Background gradient effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-red-500/[0.08] to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-tl from-purple-500/[0.05] to-transparent rounded-full blur-3xl" />
      </div>

      <div className="container max-w-6xl mx-auto px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] xl:grid-cols-[340px_1fr] gap-6 lg:gap-8 items-start">
          {/* Left Sidebar - Profile Info */}
          <aside className="lg:sticky lg:top-24">
            <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-card/90 via-card/70 to-card/50 backdrop-blur-2xl shadow-2xl shadow-black/20">
              {/* Decorative elements */}
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-red-500/10 via-red-500/5 to-transparent" />
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-red-500/20 to-transparent rounded-full blur-3xl" />

              <div className="relative p-6 lg:p-8 flex flex-col items-center text-center space-y-6">
                {/* Profile Badge */}
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-red-500/20 to-red-600/10 border border-red-500/20">
                  <Sparkles className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-xs font-semibold text-red-300/90 uppercase tracking-wider">
                    Profile
                  </span>
                </div>

                {/* Avatar Section */}
                <div className="relative group">
                  {/* Glow effect */}
                  <div className="absolute -inset-2 bg-gradient-to-r from-red-500/20 via-purple-500/20 to-red-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative w-32 h-32 lg:w-36 lg:h-36 rounded-full p-1 bg-gradient-to-br from-red-500/30 via-purple-500/20 to-red-600/30 shadow-2xl shadow-red-500/10">
                    <div className="w-full h-full rounded-full bg-background p-0.5">
                      <Avatar
                        src={displayImage}
                        alt={user.name}
                        className="w-full h-full rounded-full object-cover"
                        fallback={
                          <UserIcon className="w-16 h-16 lg:w-20 lg:h-20 text-muted-foreground/50" />
                        }
                      />
                    </div>
                    {/* Loading overlay during upload */}
                    {isUploading ? (
                      <div className="absolute inset-1 flex items-center justify-center rounded-full bg-black/70 backdrop-blur-sm">
                        <Loader2 className="w-8 h-8 animate-spin text-white" />
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={handleFileClick}
                    className="absolute inset-1 flex items-center justify-center rounded-full bg-gradient-to-t from-black/80 via-black/60 to-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer text-white"
                  >
                    <div className="flex flex-col items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                      {isUploading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5" />
                      )}
                      <span className="text-xs font-medium">Change</span>
                    </div>
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

                {/* User Info */}
                <div className="space-y-2 w-full">
                  <h1 className="text-2xl lg:text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text truncate">
                    {user.name}
                  </h1>
                  {user.username ? (
                    <p className="text-muted-foreground/80 font-medium text-sm">
                      @{user.username}
                    </p>
                  ) : null}
                </div>

                {/* Separator */}
                <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                {/* Meta Info */}
                <div className="w-full space-y-3">
                  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors group/item">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-muted/80 to-muted/40 group-hover/item:from-red-500/20 group-hover/item:to-red-600/10 transition-colors">
                      <Mail className="w-4 h-4 text-muted-foreground group-hover/item:text-red-400 transition-colors" />
                    </div>
                    <span className="text-sm text-muted-foreground truncate flex-1 text-left">
                      {user.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors group/item">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-muted/80 to-muted/40 group-hover/item:from-red-500/20 group-hover/item:to-red-600/10 transition-colors">
                      <Calendar className="w-4 h-4 text-muted-foreground group-hover/item:text-red-400 transition-colors" />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Joined {formattedJoinDate}
                    </span>
                  </div>
                </div>

                {/* Sign Out Button */}
                <Button
                  variant="ghost"
                  className="w-full mt-2 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-2xl border border-destructive/20 hover:border-destructive/30 transition-all group/btn"
                  onClick={logout}
                >
                  <LogOut className="w-4 h-4 mr-2 group-hover/btn:translate-x-0.5 transition-transform" />
                  Sign Out
                </Button>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="min-w-0 flex-1">
            {/* Tabs Navigation */}
            <div className="sticky top-0 z-10 py-4 mb-8">
              <div className="flex items-center justify-between gap-4">
                {/* Tab Buttons */}
                <div className="inline-flex items-center gap-2 flex-1 lg:flex-none">
                  <TabButton
                    isActive={activeTab === 'overview'}
                    onClick={() => setActiveTab('overview')}
                    icon={<Activity className="w-4 h-4" />}
                  >
                    Overview
                  </TabButton>
                  <TabButton
                    isActive={activeTab === 'settings'}
                    onClick={() => setActiveTab('settings')}
                    icon={<Lock className="w-4 h-4" />}
                  >
                    Settings
                  </TabButton>
                </div>

                {/* Close Button */}
                <Link
                  href="/home"
                  className="hidden lg:flex p-3 rounded-2xl bg-gradient-to-br from-muted/40 to-muted/20 backdrop-blur-xl border border-white/[0.08] shadow-lg shadow-black/5 hover:shadow-xl hover:from-muted/50 hover:to-muted/30 transition-all hover:scale-105 active:scale-95 group items-center justify-center"
                >
                  <X className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:rotate-90 transition-all duration-300" />
                </Link>
              </div>
            </div>

            {/* Tab Content */}
            <div
              key={activeTab}
              className="animate-in fade-in duration-500 slide-in-from-bottom-4"
            >
              {activeTab === 'overview' ? (
                <div className="space-y-8">
                  <ProfileSection
                    title="Watch Activity"
                    description="Your viewing journey over the past year"
                    icon={<Activity className="w-5 h-5 text-red-400" />}
                  >
                    <ActivityGraph
                      activity={activity}
                      createdAt={userCreatedAtDate}
                      isLoading={loadingActivity}
                    />
                  </ProfileSection>
                </div>
              ) : null}

              {activeTab === 'settings' ? (
                <div className="space-y-8">
                  <ProfileSection
                    title="Public Profile"
                    description="Manage how others see you on the platform"
                    icon={<UserIcon className="w-5 h-5 text-red-400" />}
                  >
                    <UpdateProfileForm />
                  </ProfileSection>

                  <ProfileSection
                    title="Security"
                    description="Update your password and secure your account"
                    icon={<Lock className="w-5 h-5 text-red-400" />}
                  >
                    <ChangePasswordForm />
                  </ProfileSection>
                </div>
              ) : null}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
