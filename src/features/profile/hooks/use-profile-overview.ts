import { useFormatter, useTranslations } from 'next-intl';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/providers/auth-provider';
import { getWatchActivity, uploadProfileImage } from '../api';
import type { WatchActivity } from '../types';

/**
 * Hook that powers the profile overview page.
 *
 * Fetches watch-activity data on mount (and on window re-focus), handles
 * profile-image uploads with an optimistic local preview, and derives
 * display values such as the formatted join date.
 *
 * @returns User data, activity list, upload helpers, display image URL,
 *          file-input ref, formatted join date, and the `logout` action.
 */
export function useProfileOverview() {
  const { user, logout, updateUser } = useAuth();
  const t = useTranslations('profile.messages');
  const format = useFormatter();
  const [activity, setActivity] = useState<WatchActivity[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoadingActivity(true);
    getWatchActivity()
      .then(setActivity)
      .catch(() => toast.error(t('activityFailed')))
      .finally(() => setLoadingActivity(false));

    const handleFocus = () => {
      getWatchActivity()
        .then(setActivity)
        .catch(() => {});
    };
    window.addEventListener('focus', handleFocus, { passive: true });
    return () => window.removeEventListener('focus', handleFocus);
  }, [t]);

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
        toast.success(t('imageUpdated'));
      } catch {
        setPreviewImage(null);
        toast.error(t('imageFailed'));
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        URL.revokeObjectURL(localPreviewUrl);
      }
    },
    [updateUser, t],
  );

  const displayImage = previewImage || user?.profilePhoto;

  const userCreatedAtDate = useMemo(
    () => (user?.createdAt ? new Date(user.createdAt) : undefined),
    [user?.createdAt],
  );

  const formattedJoinDate = useMemo(
    () =>
      userCreatedAtDate
        ? format.dateTime(userCreatedAtDate, {
            month: 'long',
            year: 'numeric',
          })
        : t('unknown'),
    [userCreatedAtDate, format, t],
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
