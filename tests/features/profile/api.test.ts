import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  changePassword,
  checkUsername,
  deleteAccount,
  getProfile,
  getWatchActivity,
  invalidateProfileCache,
  updateProfile,
  uploadProfileImage,
} from '@/features/profile/api';
import { apiFetch } from '@/lib/fetch';
import type { User } from '@/types';

// Mock apiFetch
vi.mock('@/lib/fetch', () => import('./__mocks__/lib-fetch'));

// Mock env
vi.mock('@/lib/env', () => import('./__mocks__/lib-env'));

describe('Profile API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateProfileCache();
  });

  describe('getProfile', () => {
    it('should fetch user profile', async () => {
      const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        profilePhoto: null,
        preferredServer: 's1' as 's1' | 's1',
        sessionId: 'test-session',
        createdAt: '2024-01-01',
      };

      vi.mocked(apiFetch).mockResolvedValueOnce({ user: mockUser });

      const result = await getProfile();

      expect(apiFetch).toHaveBeenCalledWith('/api/auth/me', undefined);
      expect(result).toEqual({ user: mockUser });
    });

    it('should pass options to apiFetch', async () => {
      const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        profilePhoto: null,
        preferredServer: 's1' as 's1' | 's1',
        sessionId: 'test-session',
        createdAt: '2024-01-01',
      };

      vi.mocked(apiFetch).mockResolvedValueOnce({ user: mockUser });

      const options = { signal: new AbortController().signal };
      await getProfile(options);

      expect(apiFetch).toHaveBeenCalledWith('/api/auth/me', options);
    });

    it('should cache profile data', async () => {
      const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        profilePhoto: null,
        preferredServer: 's1' as 's1' | 's1',
        sessionId: 'test-session',
        createdAt: '2024-01-01',
      };

      vi.mocked(apiFetch).mockResolvedValueOnce({ user: mockUser });

      // First call
      await getProfile();
      expect(apiFetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await getProfile();
      expect(apiFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updateData = { name: 'Updated Name', email: 'updated@example.com' };
      const mockUser: User = {
        id: '1',
        email: 'updated@example.com',
        name: 'Updated Name',
        username: 'testuser',
        profilePhoto: null,
        preferredServer: 's1' as 's1' | 's1',
        sessionId: 'test-session',
        createdAt: '2024-01-01',
      };

      vi.mocked(apiFetch).mockResolvedValueOnce({ user: mockUser });

      const result = await updateProfile(updateData);

      expect(apiFetch).toHaveBeenCalledWith('/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });
      expect(result).toEqual({ user: mockUser });
    });

    it('should pass options to apiFetch', async () => {
      const updateData = { name: 'Updated Name' };
      const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        name: 'Updated Name',
        username: 'testuser',
        profilePhoto: null,
        preferredServer: 's1' as 's1' | 's1',
        sessionId: 'test-session',
        createdAt: '2024-01-01',
      };

      vi.mocked(apiFetch).mockResolvedValueOnce({ user: mockUser });

      const options = { signal: new AbortController().signal };
      await updateProfile(updateData, options);

      expect(apiFetch).toHaveBeenCalledWith('/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify(updateData),
        signal: options.signal,
      });
    });

    it('should update cache with new data', async () => {
      const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        profilePhoto: null,
        preferredServer: 's1' as 's1' | 's1',
        sessionId: 'test-session',
        createdAt: '2024-01-01',
      };

      vi.mocked(apiFetch).mockResolvedValueOnce({ user: mockUser });

      // First get profile
      await getProfile();

      const updatedUser: User = { ...mockUser, name: 'Updated Name' };
      vi.mocked(apiFetch).mockResolvedValueOnce({ user: updatedUser });

      // Update profile
      await updateProfile({ name: 'Updated Name' });

      // Next getProfile should use updated cache
      const result = await getProfile();
      expect(result.user.name).toBe('Updated Name');
    });
  });

  describe('checkUsername', () => {
    it('should check username availability', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({ available: true });

      const result = await checkUsername('newusername');

      expect(apiFetch).toHaveBeenCalledWith(
        '/api/user/check-username/newusername',
        undefined,
      );
      expect(result).toEqual({ available: true });
    });

    it('should return unavailable for taken username', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({ available: false });

      const result = await checkUsername('takenusername');

      expect(result).toEqual({ available: false });
    });

    it('should pass options to apiFetch', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({ available: true });

      const options = { signal: new AbortController().signal };
      await checkUsername('testuser', options);

      expect(apiFetch).toHaveBeenCalledWith(
        '/api/user/check-username/testuser',
        options,
      );
    });
  });

  describe('getWatchActivity', () => {
    it('should fetch watch activity', async () => {
      const mockActivity = [
        { date: '2024-01-01', watchSeconds: 3600, level: 4 },
        { date: '2024-01-02', watchSeconds: 1800, level: 2 },
      ];

      vi.mocked(apiFetch).mockResolvedValueOnce({ activity: mockActivity });

      const result = await getWatchActivity();

      expect(apiFetch).toHaveBeenCalledWith('/api/watch/activity', undefined);
      expect(result).toEqual([
        { date: '2024-01-01', count: 60, level: 4 },
        { date: '2024-01-02', count: 30, level: 2 },
      ]);
    });

    it('should convert watchSeconds to minutes', async () => {
      const mockActivity = [
        { date: '2024-01-01', watchSeconds: 120, level: 1 },
      ];

      vi.mocked(apiFetch).mockResolvedValueOnce({ activity: mockActivity });

      const result = await getWatchActivity();

      expect(result[0].count).toBe(2); // 120 seconds = 2 minutes
    });

    it('should pass options to apiFetch', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({ activity: [] });

      const options = { signal: new AbortController().signal };
      await getWatchActivity(options);

      expect(apiFetch).toHaveBeenCalledWith('/api/watch/activity', options);
    });

    it('should handle empty activity', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({ activity: [] });

      const result = await getWatchActivity();

      expect(result).toEqual([]);
    });
  });

  describe('uploadProfileImage', () => {
    it('should upload profile image', async () => {
      const mockFile = new File(['image'], 'avatar.jpg', {
        type: 'image/jpeg',
      });
      const mockProfilePhoto = 'https://example.com/avatar.jpg';

      vi.mocked(apiFetch).mockResolvedValueOnce({
        user: { profilePhoto: mockProfilePhoto },
      });

      const result = await uploadProfileImage(mockFile);

      expect(apiFetch).toHaveBeenCalledWith(
        '/api/user/profile-image',
        expect.objectContaining({
          method: 'POST',
        }),
      );
      expect(result).toEqual({ url: mockProfilePhoto });
    });

    it('should include file in FormData', async () => {
      const mockFile = new File(['image'], 'avatar.jpg', {
        type: 'image/jpeg',
      });

      vi.mocked(apiFetch).mockResolvedValueOnce({
        user: { profilePhoto: 'https://example.com/avatar.jpg' },
      });

      await uploadProfileImage(mockFile);

      const apiFetchCall = vi.mocked(apiFetch).mock.calls[0];
      const formData = apiFetchCall[1]?.body as FormData;

      expect(formData).toBeInstanceOf(FormData);
      expect(formData.get('image')).toBe(mockFile);
    });

    it('should handle upload error', async () => {
      const mockFile = new File(['image'], 'avatar.jpg', {
        type: 'image/jpeg',
      });

      vi.mocked(apiFetch).mockRejectedValueOnce(new Error('Upload failed'));

      await expect(uploadProfileImage(mockFile)).rejects.toThrow(
        'Upload failed',
      );
    });
  });

  describe('invalidateProfileCache', () => {
    it('should clear profile cache', async () => {
      const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        profilePhoto: null,
        preferredServer: 's1' as 's1' | 's1',
        sessionId: 'test-session',
        createdAt: '2024-01-01',
      };

      vi.mocked(apiFetch).mockResolvedValueOnce({ user: mockUser });

      // First call - should cache
      await getProfile();
      expect(apiFetch).toHaveBeenCalledTimes(1);

      // Invalidate cache
      invalidateProfileCache();

      // Next call should fetch again
      vi.mocked(apiFetch).mockResolvedValueOnce({ user: mockUser });
      await getProfile();
      expect(apiFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('changePassword', () => {
    it('should call apiFetch with correct parameters', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

      await changePassword({
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword456',
      });

      expect(apiFetch).toHaveBeenCalledWith('/api/auth/password', {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword: 'oldPassword123',
          newPassword: 'newPassword456',
        }),
      });
    });

    it('should pass options to apiFetch', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

      const options = { signal: new AbortController().signal };
      await changePassword(
        { currentPassword: 'old', newPassword: 'new' },
        options,
      );

      expect(apiFetch).toHaveBeenCalledWith('/api/auth/password', {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword: 'old',
          newPassword: 'new',
        }),
        signal: options.signal,
      });
    });

    it('should throw error on failure', async () => {
      vi.mocked(apiFetch).mockRejectedValueOnce(new Error('Invalid password'));

      await expect(
        changePassword({ currentPassword: 'wrong', newPassword: 'new' }),
      ).rejects.toThrow('Invalid password');
    });
  });

  describe('deleteAccount', () => {
    it('should call DELETE /api/user/profile', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({});
      const options = { signal: new AbortController().signal };

      await deleteAccount(options);

      expect(apiFetch).toHaveBeenCalledWith('/api/user/profile', {
        method: 'DELETE',
        ...options,
      });
    });

    it('should throw error on failure', async () => {
      vi.mocked(apiFetch).mockRejectedValueOnce(
        new Error('Failed to delete account'),
      );

      await expect(deleteAccount()).rejects.toThrow('Failed to delete account');
    });
  });
});
