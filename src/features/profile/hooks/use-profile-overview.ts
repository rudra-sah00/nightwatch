import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/providers/auth-provider';
import { getWatchActivity, uploadProfileImage } from '../api';
import type { WatchActivity } from '../types';

export function useProfileOverview() {
  const { user, logout, updateUser } = useAuth();
  const [activity, setActivity] = useState<WatchActivity[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoadingActivity(true);
    getWatchActivity()
      .then(setActivity)
      .catch(() => toast.error('Failed to load activity'))
      .finally(() => setLoadingActivity(false));

    const handleFocus = () => {
      getWatchActivity()
        .then(setActivity)
        .catch(() => {});
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

      const localPreviewUrl = URL.createObjectURL(file);
      setPreviewImage(localPreviewUrl);

      try {
        setIsUploading(true);
        const { url } = await uploadProfileImage(file);
        updateUser({ profilePhoto: url });
        setPreviewImage(null);
        toast.success('Profile image updated');
      } catch {
        setPreviewImage(null);
        toast.error('Failed to upload image');
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
    displayImage,
    fileInputRef,
    formattedJoinDate,
    handleFileClick,
    handleFileChange,
  };
}
