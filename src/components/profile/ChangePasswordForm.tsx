'use client';

/**
 * Change Password Form - Clean Design (No Card)
 */

import { AlertCircle, Check, Eye, EyeOff, Lock } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui';
import { changePassword } from '@/services/api/user';

interface ChangePasswordFormProps {
  onSuccess?: () => void;
}

export function ChangePasswordForm({ onSuccess }: ChangePasswordFormProps) {
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
    <div className="security-section">
      <div className="section-header">
        <h3>Password Security</h3>
        <p>Manage your account password.</p>
      </div>

      <form onSubmit={handleSubmit} className="form-grid">
        {/* Current Password - Full Width */}
        <div className="input-group full-width">
          <label htmlFor="current-password">Current Password</label>
          <div className="input-wrapper">
            <Lock size={16} className="field-icon" />
            <input
              id="current-password"
              type={visible.current ? 'text' : 'password'}
              name="current"
              value={formData.current}
              onChange={handleChange}
              placeholder="••••••••••••"
              required
            />
            <button
              type="button"
              onClick={() => toggleVisibility('current')}
              className="visibility-btn"
            >
              {visible.current ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* New Password Fields - Side by Side */}
        <div className="fields-row">
          <div className="input-group">
            <label htmlFor="new-password">New Password</label>
            <div className="input-wrapper">
              <Lock size={16} className="field-icon" />
              <input
                id="new-password"
                type={visible.new ? 'text' : 'password'}
                name="new"
                value={formData.new}
                onChange={handleChange}
                placeholder="New password (min 8 chars)"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => toggleVisibility('new')}
                className="visibility-btn"
              >
                {visible.new ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="confirm-password">Confirm Password</label>
            <div className="input-wrapper">
              <Lock size={16} className="field-icon" />
              <input
                id="confirm-password"
                type={visible.confirm ? 'text' : 'password'}
                name="confirm"
                value={formData.confirm}
                onChange={handleChange}
                placeholder="Confirm new password"
                required
              />
            </div>
          </div>
        </div>

        {/* Validation Hints */}
        {(formData.new || formData.confirm) && (
          <div className="validation-hints">
            {!isStrong && formData.new && (
              <span className="error">• Password too short (min 8)</span>
            )}
            {!passwordsMatch && formData.confirm && (
              <span className="error">• Passwords do not match</span>
            )}
          </div>
        )}

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

          <Button type="submit" disabled={!isValid || status === 'loading'} className="update-btn">
            {status === 'loading' ? 'Updating...' : 'Update Password'}
          </Button>
        </div>
      </form>

      <style jsx>{`
        .security-section {
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
            gap: 20px;
        }

        .fields-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }

        @media (max-width: 640px) {
            .fields-row {
                grid-template-columns: 1fr;
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
            padding: 10px 40px 10px 16px; /* Reduced left padding */
            background: #09090b;
            border: 1px solid #27272a;
            border-radius: 8px;
            color: #fff;
            font-size: 14px;
            transition: all 0.2s;
            flex: 1; /* Take remaining width */
        }

        input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 1px #3b82f6;
        }

        .visibility-btn {
            position: absolute;
            right: 12px;
            background: none;
            border: none;
            color: #71717a;
            cursor: pointer;
            padding: 4px;
            display: flex;
            align-items: center;
        }

        .visibility-btn:hover {
            color: #fff;
        }

        .validation-hints {
            display: flex;
            gap: 16px;
            font-size: 12px;
        }

        .validation-hints .error {
            color: #ef4444;
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

        .update-btn {
            background: #fff;
            color: #000;
            font-weight: 600;
        }
        .update-btn:hover:not(:disabled) { background: #e4e4e7; }
        .update-btn:disabled { opacity: 0.5; }
      `}</style>
    </div>
  );
}
