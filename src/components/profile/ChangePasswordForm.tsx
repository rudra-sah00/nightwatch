'use client';

/**
 * Change Password Form with Logout - Clean Design
 */

import { AlertCircle, Check, Eye, EyeOff, Lock, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { changePassword } from '@/services/api/user';

interface ChangePasswordFormProps {
  onSuccess?: () => void;
}

export function ChangePasswordForm({ onSuccess }: ChangePasswordFormProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const [formData, setFormData] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [visible, setVisible] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push('/login');
    } catch (_error) {
      setIsLoggingOut(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (status === 'error') setStatus('idle');
  };

  const toggleVisibility = (field: keyof typeof visible) => {
    setVisible((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const passwordsMatch = formData.new === formData.confirm;
  const isStrong = formData.new.length >= 8;
  const isValid = formData.current && formData.new && passwordsMatch && isStrong;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setStatus('loading');
    try {
      await changePassword({
        current_password: formData.current,
        new_password: formData.new,
      });

      setStatus('success');
      setMessage('Password updated successfully');
      setFormData({ current: '', new: '', confirm: '' });
      onSuccess?.();

      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 3000);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Failed to update password');
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Password Section */}
      <div className="flex flex-col gap-6">
        <div className="section-header">
          <h3 className="text-lg font-semibold text-white mb-1">Password Security</h3>
          <p className="text-zinc-500 text-sm">Manage your account password.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Current Password - Full Width */}
          <div className="flex flex-col gap-2">
            <label htmlFor="current-password" className="text-[13px] font-medium text-zinc-300">
              Current Password
            </label>
            <div className="relative flex items-center gap-3">
              <Lock size={16} className="text-zinc-500 shrink-0" />
              <input
                id="current-password"
                type={visible.current ? 'text' : 'password'}
                name="current"
                value={formData.current}
                onChange={handleChange}
                placeholder="••••••••••••"
                required
                className="w-full flex-1 py-2.5 px-4 pr-10 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => toggleVisibility('current')}
                className="absolute right-3 bg-transparent border-none text-zinc-500 cursor-pointer p-1 flex items-center hover:text-white transition-colors"
              >
                {visible.current ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* New Password Fields - Side by Side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="new-password" className="text-[13px] font-medium text-zinc-300">
                New Password
              </label>
              <div className="relative flex items-center gap-3">
                <Lock size={16} className="text-zinc-500 shrink-0" />
                <input
                  id="new-password"
                  type={visible.new ? 'text' : 'password'}
                  name="new"
                  value={formData.new}
                  onChange={handleChange}
                  placeholder="New password (min 8 chars)"
                  minLength={8}
                  required
                  className="w-full flex-1 py-2.5 px-4 pr-10 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility('new')}
                  className="absolute right-3 bg-transparent border-none text-zinc-500 cursor-pointer p-1 flex items-center hover:text-white transition-colors"
                >
                  {visible.new ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="confirm-password" className="text-[13px] font-medium text-zinc-300">
                Confirm Password
              </label>
              <div className="relative flex items-center gap-3">
                <Lock size={16} className="text-zinc-500 shrink-0" />
                <input
                  id="confirm-password"
                  type={visible.confirm ? 'text' : 'password'}
                  name="confirm"
                  value={formData.confirm}
                  onChange={handleChange}
                  placeholder="Confirm new password"
                  required
                  className="w-full flex-1 py-2.5 px-4 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Validation Hints */}
          {(formData.new || formData.confirm) && (
            <div className="flex gap-4 text-xs">
              {!isStrong && formData.new && (
                <span className="text-red-500">• Password too short (min 8)</span>
              )}
              {!passwordsMatch && formData.confirm && (
                <span className="text-red-500">• Passwords do not match</span>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-4 mt-2">
            {status === 'success' && (
              <div className="flex items-center gap-1.5 text-[13px] font-medium text-emerald-500">
                <Check size={16} /> <span>{message}</span>
              </div>
            )}
            {status === 'error' && (
              <div className="flex items-center gap-1.5 text-[13px] font-medium text-red-500">
                <AlertCircle size={16} /> <span>{message}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={!isValid || status === 'loading'}
              className="bg-white text-black font-semibold hover:bg-zinc-200 disabled:opacity-50"
            >
              {status === 'loading' ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </form>
      </div>

      {/* Logout Section */}
      <div className="flex flex-col gap-4 pt-6 border-t border-zinc-800">
        <div className="section-header">
          <h3 className="text-lg font-semibold text-white mb-1">Sign Out</h3>
          <p className="text-zinc-500 text-sm">Sign out from your account on this device.</p>
        </div>

        <Button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full sm:w-auto bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 gap-2"
        >
          <LogOut size={18} />
          {isLoggingOut ? 'Signing out...' : 'Sign Out'}
        </Button>
      </div>
    </div>
  );
}
