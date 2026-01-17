'use client';

/**
 * Change Password Form Component
 */

import { CheckCircle, Eye, EyeOff, Lock, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui';
import { changePassword } from '@/services/api/user';

interface ChangePasswordFormProps {
  onSuccess?: () => void;
}

export function ChangePasswordForm({ onSuccess }: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordsMatch = newPassword === confirmPassword;
  const isValid = currentPassword.length > 0 && newPassword.length >= 8 && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="change-password-form">
      {success && (
        <div className="success-message">
          <CheckCircle size={20} />
          <span>Password changed successfully!</span>
        </div>
      )}

      {error && (
        <div className="error-message">
          <XCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="current-password">Current Password</label>
        <div className="input-wrapper">
          <Lock size={18} className="input-icon" />
          <input
            id="current-password"
            type={showCurrentPassword ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
            required
          />
          <button
            type="button"
            className="toggle-visibility"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
          >
            {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="new-password">New Password</label>
        <div className="input-wrapper">
          <Lock size={18} className="input-icon" />
          <input
            id="new-password"
            type={showNewPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password (min 8 characters)"
            minLength={8}
            required
          />
          <button
            type="button"
            className="toggle-visibility"
            onClick={() => setShowNewPassword(!showNewPassword)}
            aria-label={showNewPassword ? 'Hide password' : 'Show password'}
          >
            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {newPassword.length > 0 && newPassword.length < 8 && (
          <span className="hint error">Password must be at least 8 characters</span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="confirm-password">Confirm New Password</label>
        <div className="input-wrapper">
          <Lock size={18} className="input-icon" />
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
          />
        </div>
        {confirmPassword.length > 0 && !passwordsMatch && (
          <span className="hint error">Passwords do not match</span>
        )}
      </div>

      <Button type="submit" disabled={!isValid || loading} className="submit-button">
        {loading ? 'Changing...' : 'Change Password'}
      </Button>

      <style jsx>{`
        .change-password-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-width: 400px;
        }
        
        .success-message,
        .error-message {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 14px;
        }
        
        .success-message {
          background: rgba(39, 213, 83, 0.15);
          color: #27d553;
          border: 1px solid rgba(39, 213, 83, 0.3);
        }
        
        .error-message {
          background: rgba(248, 81, 73, 0.15);
          color: #f85149;
          border: 1px solid rgba(248, 81, 73, 0.3);
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        label {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary, #e6edf3);
        }
        
        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        
        .input-icon {
          position: absolute;
          left: 12px;
          color: var(--text-secondary, #8b949e);
          pointer-events: none;
        }
        
        input {
          width: 100%;
          padding: 12px 44px;
          background: var(--bg-tertiary, #21262d);
          border: 1px solid var(--border-color, #30363d);
          border-radius: 8px;
          font-size: 14px;
          color: var(--text-primary, #e6edf3);
          transition: border-color 0.2s ease;
        }
        
        input:focus {
          outline: none;
          border-color: var(--accent-primary, #58a6ff);
        }
        
        input::placeholder {
          color: var(--text-tertiary, #6e7681);
        }
        
        .toggle-visibility {
          position: absolute;
          right: 12px;
          background: transparent;
          border: none;
          color: var(--text-secondary, #8b949e);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .toggle-visibility:hover {
          color: var(--text-primary, #e6edf3);
        }
        
        .hint {
          font-size: 12px;
          color: var(--text-secondary, #8b949e);
        }
        
        .hint.error {
          color: #f85149;
        }
        
        .submit-button {
          margin-top: 8px;
        }
      `}</style>
    </form>
  );
}
