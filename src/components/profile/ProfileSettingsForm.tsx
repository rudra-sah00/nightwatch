'use client';

/**
 * Profile Settings Form
 * Update name, username, and avatar - Tailwind CSS optimized
 */

import { AlertCircle, AtSign, Camera, Check, Save, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import { type UserProfile, updateProfile, uploadAvatar } from '@/services/api/user';

interface ProfileSettingsFormProps {
  initialData: UserProfile;
  onUpdate: () => void;
}

export function ProfileSettingsForm({ initialData, onUpdate }: ProfileSettingsFormProps) {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    username: initialData.username || '',
    avatar_url: initialData.avatar_url || '',
  });

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Update local state when initialData changes (e.g. after refresh)
  useEffect(() => {
    setFormData({
      name: initialData.name || '',
      username: initialData.username || '',
      avatar_url: initialData.avatar_url || '',
    });
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (status === 'error') setStatus('idle');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      await updateProfile({
        name: formData.name,
        username: formData.username !== initialData.username ? formData.username : undefined,
        avatar_url:
          formData.avatar_url !== initialData.avatar_url ? formData.avatar_url : undefined,
      });

      setStatus('success');
      setMessage('Profile updated successfully');
      onUpdate?.();

      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 3000);
    } catch (err: unknown) {
      console.error('Profile update error:', err);
      setStatus('error');

      // Handle structured errors from our API client
      const error = err as { response?: { data?: { details?: string } }; message?: string };
      const errorMsg = error.response?.data?.details || error.message || 'Failed to update profile';
      setMessage(errorMsg);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Section Header */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">Profile Information</h3>
        <p className="text-zinc-500 text-sm">Update your public profile details.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Avatar Preview & Upload */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar Preview */}
          <div className="relative w-20 h-20 sm:w-[88px] sm:h-[88px] rounded-full bg-gradient-to-br from-blue-500 to-purple-500 border-2 border-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
            <span className="text-2xl sm:text-3xl font-bold text-white z-[1]">
              {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
            </span>
            {formData.avatar_url && (
              <img
                src={formData.avatar_url}
                alt="Avatar"
                className="absolute inset-0 w-full h-full object-cover z-[2] rounded-full"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
          </div>

          {/* Upload Section */}
          <div className="flex flex-col gap-2 text-center sm:text-left">
            <label htmlFor="avatar-upload" className="text-sm font-medium text-zinc-300">
              Profile Photo
            </label>
            <div className="flex gap-3 items-center justify-center sm:justify-start">
              <Button
                type="button"
                variant="ghost"
                className="h-9 px-4 text-sm bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 gap-2"
                onClick={() => document.getElementById('avatar-upload')?.click()}
              >
                <Camera size={16} /> Upload Photo
              </Button>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  if (e.target.files?.[0]) {
                    try {
                      setStatus('loading');
                      const res = await uploadAvatar(e.target.files[0]);
                      setFormData((prev) => ({ ...prev, avatar_url: res.avatar_url }));
                      setStatus('success');
                      setMessage('Photo uploaded');
                      onUpdate?.();
                    } catch (_err) {
                      setStatus('error');
                      setMessage('Upload failed');
                    }
                  }
                }}
                className="hidden"
              />
            </div>
            <p className="text-xs text-zinc-600">JPG, PNG or GIF. Max 2MB.</p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.06] w-full" />

        {/* Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Display Name */}
          <div className="flex flex-col gap-2">
            <label htmlFor="name-input" className="text-[13px] font-medium text-zinc-300">
              Display Name
            </label>
            <div className="relative flex items-center gap-3">
              <User size={16} className="text-zinc-500 flex-shrink-0" />
              <input
                id="name-input"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your Name"
                required
                minLength={2}
                className="flex-1 w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
              />
            </div>
          </div>

          {/* Username */}
          <div className="flex flex-col gap-2">
            <label htmlFor="username-input" className="text-[13px] font-medium text-zinc-300">
              Username
            </label>
            <div className="relative flex items-center gap-3">
              <AtSign size={16} className="text-zinc-500 flex-shrink-0" />
              <input
                id="username-input"
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="username"
                required
                minLength={3}
                maxLength={30}
                pattern="^[a-zA-Z0-9_-]+$"
                title="Usernames can only contain letters, numbers, underscores, and hyphens"
                className="flex-1 w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
              />
            </div>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-4 mt-2">
          {status === 'success' && (
            <div className="flex items-center gap-1.5 text-emerald-500 text-sm font-medium animate-in fade-in duration-200">
              <Check size={16} /> <span>{message}</span>
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center gap-1.5 text-red-500 text-sm font-medium animate-in fade-in duration-200">
              <AlertCircle size={16} /> <span>{message}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={status === 'loading'}
            className="w-full sm:w-auto bg-white text-black font-semibold hover:bg-zinc-200 disabled:opacity-70 disabled:cursor-not-allowed gap-2"
          >
            {status === 'loading' ? (
              'Saving...'
            ) : (
              <>
                <Save size={18} /> Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
