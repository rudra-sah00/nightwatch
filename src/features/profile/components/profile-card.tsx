'use client';

import { Calendar, Camera, Loader2, Mail, User as UserIcon, X } from 'lucide-react';
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

// Reusable ProfileSection component
interface ProfileSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

const ProfileSection = ({ title, description, children }: ProfileSectionProps) => (
  <section className="space-y-4 w-full">
    <div>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    <div className="rounded-2xl border bg-card/40 backdrop-blur-sm p-6 lg:p-8 w-full">
      {children}
    </div>
  </section>
);

// Tab button component to reduce duplication
interface TabButtonProps {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const TabButton = ({ isActive, onClick, children }: TabButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-full px-6 lg:px-8 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      isActive
        ? 'bg-background text-foreground shadow-sm'
        : 'text-muted-foreground hover:bg-background/50 hover:text-foreground',
    )}
  >
    {children}
  </button>
);

type TabType = 'overview' | 'settings';

export function ProfileCard() {
  const { user, logout, updateUser } = useAuth();
  const [activity, setActivity] = useState<WatchActivity[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getWatchActivity()
      .then(setActivity)
      .catch(() => toast.error('Failed to load activity'));
  }, []);

  const handleFileClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const { url } = await uploadProfileImage(file);
      // Update user profile photo in auth context
      updateUser({ profilePhoto: url });
      toast.success('Profile image updated successfully');
    } catch {
      toast.error('Failed to upload profile image');
    } finally {
      setIsUploading(false);
    }
  }, [updateUser]);

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
      <div className="container max-w-6xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr] gap-6 lg:gap-8 items-start">
          {/* Left Sidebar - Profile Info */}
          <aside className="lg:sticky lg:top-24">
            <div className="rounded-2xl border bg-card/60 backdrop-blur-xl p-6 lg:p-8 shadow-sm flex flex-col items-center text-center space-y-5">
              {/* Profile Label */}
              <div className="w-full flex items-center justify-center pb-2 border-b border-border/10">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Profile Card
                </span>
              </div>

              {/* Avatar Section */}
              <div className="relative group">
                <div className="w-32 h-32 lg:w-36 lg:h-36 rounded-full p-1 border-2 border-border/30 bg-background shadow-xl">
                  <Avatar
                    src={user.profilePhoto}
                    alt={user.name}
                    className="w-full h-full rounded-full object-cover"
                    fallback={
                      <UserIcon className="w-16 h-16 lg:w-20 lg:h-20 text-muted-foreground/50" />
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={handleFileClick}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-all cursor-pointer text-white backdrop-blur-[2px]"
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
              <div className="space-y-1 w-full">
                <h1 className="text-xl lg:text-2xl font-bold tracking-tight truncate">
                  {user.name}
                </h1>
                {user.username && (
                  <p className="text-muted-foreground font-medium text-sm">@{user.username}</p>
                )}
              </div>

              {/* Meta Info */}
              <div className="w-full pt-4 border-t border-border/50 space-y-3">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="p-2 rounded-full bg-muted/50 flex-shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span className="truncate text-left">{user.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="p-2 rounded-full bg-muted/50 flex-shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <span>Joined {formattedJoinDate}</span>
                </div>
              </div>

              <div className="w-full pt-2">
                <Button
                  variant="ghost"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                  onClick={logout}
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="min-w-0 flex-1">
            {/* Tabs Navigation */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-3 lg:py-4 mb-6 flex items-center gap-4">
              {/* Tab Buttons */}
              <div className="inline-flex h-11 lg:h-12 items-center justify-center rounded-full bg-muted/30 p-1 lg:p-1.5 backdrop-blur-md border border-border/50 flex-1 lg:flex-none lg:mx-auto">
                <TabButton
                  isActive={activeTab === 'overview'}
                  onClick={() => setActiveTab('overview')}
                >
                  Overview
                </TabButton>
                <TabButton
                  isActive={activeTab === 'settings'}
                  onClick={() => setActiveTab('settings')}
                >
                  Settings
                </TabButton>
              </div>

              {/* Close Button */}
              <Link
                href="/home"
                className="hidden lg:flex p-2.5 rounded-full bg-background/80 backdrop-blur-md border border-border/50 shadow-sm hover:shadow-md hover:bg-background transition-all hover:scale-105 active:scale-95 group items-center justify-center"
              >
                <X className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
            </div>

            {/* Tab Content - Full width for laptop */}
            <div key={activeTab} className="animate-in fade-in duration-300 slide-in-from-bottom-2">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <ProfileSection
                    title="Watch Activity"
                    description="Your viewing history over the past year"
                  >
                    <ActivityGraph activity={activity} createdAt={userCreatedAtDate} />
                  </ProfileSection>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-6 lg:space-y-8">
                  <ProfileSection
                    title="Public Profile"
                    description="Manage how others see you on the platform"
                  >
                    <UpdateProfileForm />
                  </ProfileSection>

                  <ProfileSection
                    title="Security"
                    description="Update your password and secure your account"
                  >
                    <ChangePasswordForm />
                  </ProfileSection>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
