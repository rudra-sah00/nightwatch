import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFormatter, useTranslations } from 'next-intl';
import type React from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/providers/auth-provider';
import { getMusicActivity, getWatchActivity, uploadProfileImage } from '../api';
import type { ActivityData } from '../types';

/**
 * Hook that powers the profile overview page.
 * Uses TanStack Query for activity data fetching.
 */
export function useProfileOverview() {
  const { user, logout, updateUser } = useAuth();
  const t = useTranslations('profile.messages');
  const format = useFormatter();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: watchActivity = [] } = useQuery({
    queryKey: ['profile', 'activity', 'watch'],
    queryFn: () => getWatchActivity(),
    staleTime: 60_000,
  });

  const { data: musicActivity = [], isLoading: loadingActivity } = useQuery({
    queryKey: ['profile', 'activity', 'music'],
    queryFn: () => getMusicActivity(),
    staleTime: 60_000,
  });

  const activity: ActivityData = { watch: watchActivity, music: musicActivity };

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
        queryClient.invalidateQueries({ queryKey: ['profile'] });
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
    [updateUser, t, queryClient],
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
