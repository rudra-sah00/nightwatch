'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/providers/auth-provider';
import { getWatchActivity, uploadProfileImage } from '../api';
import type { WatchActivity } from '../types';

export type ProfileTabType = 'overview' | 'settings';

export function useProfileCard() {
  const { user, logout, updateUser } = useAuth();
  const [activity, setActivity] = useState<WatchActivity[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTabType>('overview');
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

      // Optimistic preview immediately
      const localPreviewUrl = URL.createObjectURL(file);
      setPreviewImage(localPreviewUrl);

      try {
        setIsUploading(true);
        const { url } = await uploadProfileImage(file);
        updateUser({ profilePhoto: url });
        setPreviewImage(null);
        toast.success('Profile image updated successfully');
      } catch {
        setPreviewImage(null);
        toast.error('Failed to upload profile image');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        URL.revokeObjectURL(localPreviewUrl);
      }
    },
    [updateUser],
  );

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

  return {
    user,
    logout,
    activity,
    loadingActivity,
    isUploading,
    activeTab,
    setActiveTab,
    fileInputRef,
    displayImage,
    userCreatedAtDate,
    formattedJoinDate,
    handleFileClick,
    handleFileChange,
  };
}
