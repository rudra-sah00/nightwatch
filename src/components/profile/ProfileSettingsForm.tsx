'use client';

/**
 * Profile Settings Form
 * Update name, username, and avatar
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
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Failed to update profile');
    }
  };

  return (
    <div className="profile-settings">
      <div className="section-header">
        <h3>Profile Information</h3>
        <p>Update your public profile details.</p>
      </div>

      <form onSubmit={handleSubmit} className="form-grid">
        {/* Avatar Preview & URL Input */}
        <div className="avatar-section">
          <div className="avatar-preview">
            {formData.avatar_url ? (
              <img
                src={formData.avatar_url}
                alt="Avatar"
                className="avatar-img"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="avatar-fallback">
                {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
              </div>
            )}
          </div>

          <div className="avatar-input">
            <label htmlFor="avatar-upload">Profile Photo</label>
            <div className="flex gap-4 items-center">
              <Button
                type="button"
                variant="ghost"
                className="upload-btn"
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
                style={{ display: 'none' }}
              />
            </div>
          </div>
        </div>

        <div className="divider" />

        <div className="fields-grid">
          <div className="input-group">
            <label htmlFor="name-input">Display Name</label>
            <div className="input-wrapper">
              <User size={16} className="field-icon" />
              <input
                id="name-input"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your Name"
                required
                minLength={2}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="username-input">Username</label>
            <div className="input-wrapper">
              <AtSign size={16} className="field-icon" />
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
              />
            </div>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="form-actions">
          {status === 'success' && (
            <div className="status-text success">
              <Check size={16} /> <span>{message}</span>
            </div>
          )}
          {status === 'error' && (
            <div className="status-text error">
              <AlertCircle size={16} /> <span>{message}</span>
            </div>
          )}

          <Button type="submit" disabled={status === 'loading'} className="save-btn">
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

      <style jsx>{`
        .profile-settings {
            display: flex;
            flex-direction: column;
            gap: 24px;
        }

        .section-header h3 {
            font-size: 18px;
            font-weight: 600;
            color: #fff;
            margin: 0 0 4px 0;
        }
        
        .section-header p {
            color: #71717a;
            font-size: 14px;
            margin: 0;
        }

        .form-grid {
            display: flex;
            flex-direction: column;
            gap: 24px;
        }

        .avatar-section {
            display: flex;
            align-items: center;
            gap: 24px;
        }

        .avatar-preview {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: #27272a;
            border: 2px solid #3f3f46;
            overflow: hidden;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .avatar-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .avatar-fallback {
            font-size: 32px;
            font-weight: 700;
            color: #71717a;
        }

        .avatar-input {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .fields-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }

        @media (max-width: 640px) {
            .fields-grid {
                grid-template-columns: 1fr;
            }
            .avatar-section {
                flex-direction: column;
                align-items: flex-start;
            }
        }

        .input-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        label {
            font-size: 13px;
            font-weight: 500;
            color: #d4d4d8;
        }

        .input-wrapper {
            position: relative;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .field-icon {
            /* Icon is now flex item outside input */
            color: #71717a;
            flex-shrink: 0;
        }

        input {
            width: 100%;
            padding: 10px 16px;
            background: #09090b;
            border: 1px solid #27272a;
            border-radius: 8px;
            color: #fff;
            font-size: 14px;
            transition: all 0.2s;
            flex: 1;
        }

        input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 1px #3b82f6;
        }
        
        .hint {
            font-size: 12px;
            color: #52525b;
            margin: 0;
        }
        
        .divider {
            height: 1px;
            background: rgba(255, 255, 255, 0.06);
            width: 100%;
        }

        .form-actions {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 16px;
            margin-top: 8px;
        }

        .status-text {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            font-weight: 500;
        }

        .status-text.success { color: #10b981; }
        .status-text.error { color: #ef4444; }

        .save-btn {
            background: #fff;
            color: #000;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .save-btn:hover { background: #e4e4e7; }
        .save-btn:disabled { opacity: 0.7; cursor: not-allowed; }

      `}</style>
    </div>
  );
}
