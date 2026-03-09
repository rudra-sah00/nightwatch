import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChangePasswordForm } from '@/features/profile/components/change-password-form';

// Mock the API
vi.mock('@/features/profile/api', () => import('../__mocks__/profile-api'));

// Mock sonner toast
vi.mock('sonner', () => import('../__mocks__/sonner'));

// Mock PasswordInfo component
vi.mock('@/components/ui/password-info', () => ({
  PasswordInfo: () => <span data-testid="password-info">Password Info</span>,
}));

// Mock PasswordStrengthIndicator component
vi.mock('@/components/ui/password-strength', () => ({
  PasswordStrengthIndicator: () => null,
}));

describe('ChangePasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to get form elements
  const getFormElements = () => ({
    currentPasswordInput: screen.getByLabelText(/^Current Password$/i),
    newPasswordInput: screen.getByLabelText(/^New Password$/i),
    confirmPasswordInput: screen.getByLabelText(/^Confirm Password$/i),
    submitButton: screen.getByRole('button', { name: /Update Password/i }),
  });

  describe('rendering', () => {
    it('renders all form fields', () => {
      render(<ChangePasswordForm />);

      const { currentPasswordInput, newPasswordInput, confirmPasswordInput } =
        getFormElements();

      expect(currentPasswordInput).toBeInTheDocument();
      expect(newPasswordInput).toBeInTheDocument();
      expect(confirmPasswordInput).toBeInTheDocument();
    });

    it('renders submit button', () => {
      render(<ChangePasswordForm />);
      expect(
        screen.getByRole('button', { name: /Update Password/i }),
      ).toBeInTheDocument();
    });

    it('renders password info component', () => {
      render(<ChangePasswordForm />);
      expect(screen.getByTestId('password-info')).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('shows error when passwords do not match', async () => {
      const user = userEvent.setup();
      render(<ChangePasswordForm />);

      const { currentPasswordInput, newPasswordInput, confirmPasswordInput } =
        getFormElements();

      await user.type(currentPasswordInput, 'oldpass123');
      await user.type(newPasswordInput, 'NewPass1!');
      await user.type(confirmPasswordInput, 'Different1!');

      const submitButton = screen.getByRole('button', {
        name: /Update Password/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/New passwords do not match/i),
        ).toBeInTheDocument();
      });
    });

    it('shows error when password is too short', async () => {
      const user = userEvent.setup();
      render(<ChangePasswordForm />);

      const { currentPasswordInput, newPasswordInput, confirmPasswordInput } =
        getFormElements();

      await user.type(currentPasswordInput, 'oldpass');
      await user.type(newPasswordInput, 'Ab1!');
      await user.type(confirmPasswordInput, 'Ab1!');

      const submitButton = screen.getByRole('button', {
        name: /Update Password/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Password must be at least 8 characters/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe('form submission', () => {
    it('calls changePassword API on valid submission', async () => {
      const { changePassword } = await import('@/features/profile/api');
      const mockChangePassword = vi.mocked(changePassword);
      mockChangePassword.mockResolvedValueOnce(undefined);

      const user = userEvent.setup();
      render(<ChangePasswordForm />);

      const { currentPasswordInput, newPasswordInput, confirmPasswordInput } =
        getFormElements();

      await user.type(currentPasswordInput, 'currentPass123');
      await user.type(newPasswordInput, 'NewPass1!');
      await user.type(confirmPasswordInput, 'NewPass1!');

      const submitButton = screen.getByRole('button', {
        name: /Update Password/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockChangePassword).toHaveBeenCalledWith({
          currentPassword: 'currentPass123',
          newPassword: 'NewPass1!',
        });
      });
    });

    it('shows toast notification after successful password change', async () => {
      const { changePassword } = await import('@/features/profile/api');
      const { toast } = await import('sonner');
      const mockChangePassword = vi.mocked(changePassword);
      mockChangePassword.mockResolvedValueOnce(undefined);

      const user = userEvent.setup();
      render(<ChangePasswordForm />);

      const { currentPasswordInput, newPasswordInput, confirmPasswordInput } =
        getFormElements();

      await user.type(currentPasswordInput, 'currentPass123');
      await user.type(newPasswordInput, 'NewPass1!');
      await user.type(confirmPasswordInput, 'NewPass1!');

      const submitButton = screen.getByRole('button', {
        name: /Update Password/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(vi.mocked(toast.success)).toHaveBeenCalledWith(
          'Password updated successfully',
        );
      });
      expect(screen.queryByText(/Password updated/i)).not.toBeInTheDocument();
    });

    it('clears form fields after successful submission', async () => {
      const { changePassword } = await import('@/features/profile/api');
      const mockChangePassword = vi.mocked(changePassword);
      mockChangePassword.mockResolvedValueOnce(undefined);

      const user = userEvent.setup();
      render(<ChangePasswordForm />);

      const { currentPasswordInput, newPasswordInput, confirmPasswordInput } =
        getFormElements();

      await user.type(currentPasswordInput, 'currentPass123');
      await user.type(newPasswordInput, 'NewPass1!');
      await user.type(confirmPasswordInput, 'NewPass1!');

      const submitButton = screen.getByRole('button', {
        name: /Update Password/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(currentPasswordInput).toHaveValue('');
        expect(newPasswordInput).toHaveValue('');
        expect(confirmPasswordInput).toHaveValue('');
      });
    });

    it('shows error message on API failure', async () => {
      const { changePassword } = await import('@/features/profile/api');
      const mockChangePassword = vi.mocked(changePassword);
      mockChangePassword.mockRejectedValueOnce(
        new Error('Invalid current password'),
      );

      const user = userEvent.setup();
      render(<ChangePasswordForm />);

      const { currentPasswordInput, newPasswordInput, confirmPasswordInput } =
        getFormElements();

      await user.type(currentPasswordInput, 'wrongPassword');
      await user.type(newPasswordInput, 'NewPass1!');
      await user.type(confirmPasswordInput, 'NewPass1!');

      const submitButton = screen.getByRole('button', {
        name: /Update Password/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Invalid current password/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('disables submit button while loading', async () => {
      const { changePassword } = await import('@/features/profile/api');
      const mockChangePassword = vi.mocked(changePassword);

      // Create a promise that we can control
      let resolvePromise: () => void;
      mockChangePassword.mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
      );

      const user = userEvent.setup();
      render(<ChangePasswordForm />);

      const { currentPasswordInput, newPasswordInput, confirmPasswordInput } =
        getFormElements();

      await user.type(currentPasswordInput, 'currentPass123');
      await user.type(newPasswordInput, 'NewPass1!');
      await user.type(confirmPasswordInput, 'NewPass1!');

      const submitButton = screen.getByRole('button', {
        name: /Update Password/i,
      });
      await user.click(submitButton);

      // Button should be disabled during loading
      expect(submitButton).toBeDisabled();

      // Resolve the promise
      resolvePromise!();
    });
  });

  describe('input fields', () => {
    it('all input fields are of type password', () => {
      render(<ChangePasswordForm />);

      const { currentPasswordInput, newPasswordInput, confirmPasswordInput } =
        getFormElements();

      expect(currentPasswordInput).toHaveAttribute('type', 'password');
      expect(newPasswordInput).toHaveAttribute('type', 'password');
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    });

    it('all input fields are required', () => {
      render(<ChangePasswordForm />);

      const { currentPasswordInput, newPasswordInput, confirmPasswordInput } =
        getFormElements();

      expect(currentPasswordInput).toBeRequired();
      expect(newPasswordInput).toBeRequired();
      expect(confirmPasswordInput).toBeRequired();
    });
  });

  describe('accessibility', () => {
    it('error message has accessible icon', async () => {
      const user = userEvent.setup();
      render(<ChangePasswordForm />);

      const { currentPasswordInput, newPasswordInput, confirmPasswordInput } =
        getFormElements();

      await user.type(currentPasswordInput, 'oldpass');
      await user.type(newPasswordInput, 'Ab1!xxx');
      await user.type(confirmPasswordInput, 'Ab1!xxx');

      const submitButton = screen.getByRole('button', {
        name: /Update Password/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Error icon')).toBeInTheDocument();
      });
    });
  });

  describe('password validation - uppercase and special character', () => {
    it('shows error when password has no uppercase letter', async () => {
      const user = userEvent.setup();
      render(<ChangePasswordForm />);

      const { currentPasswordInput, newPasswordInput, confirmPasswordInput } =
        getFormElements();

      // Password with lowercase + digits + special but no uppercase
      await user.type(currentPasswordInput, 'oldpassword');
      await user.type(newPasswordInput, 'abcdefgh1!');
      await user.type(confirmPasswordInput, 'abcdefgh1!');

      const submitButton = screen.getByRole('button', {
        name: /Update Password/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(
            'Password must contain at least one uppercase letter',
          ),
        ).toBeInTheDocument();
      });
    });

    it('shows error when password has no special character', async () => {
      const user = userEvent.setup();
      render(<ChangePasswordForm />);

      const { currentPasswordInput, newPasswordInput, confirmPasswordInput } =
        getFormElements();

      // Password with uppercase + lowercase + digits but no special char
      await user.type(currentPasswordInput, 'oldpassword');
      await user.type(newPasswordInput, 'Abcdefgh123');
      await user.type(confirmPasswordInput, 'Abcdefgh123');

      const submitButton = screen.getByRole('button', {
        name: /Update Password/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(
            'Password must contain at least one special character',
          ),
        ).toBeInTheDocument();
      });
    });
  });
});
