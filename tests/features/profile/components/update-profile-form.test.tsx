import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateProfileForm } from '@/features/profile/components/update-profile-form';
import type { User } from '@/types';

// Mock user
const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  username: 'testuser',
  profilePhoto: null,
  sessionId: 'session-123',
  createdAt: new Date().toISOString(),
};

// Mock useAuth hook
const mockUpdateUser = vi.fn();
vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({
    user: mockUser,
    updateUser: mockUpdateUser,
  }),
}));

// Mock the API
vi.mock('@/features/profile/api', () => import('../__mocks__/profile-api'));

// Mock sonner toast
vi.mock('sonner', () => import('../__mocks__/sonner'));

// Mock useDebounce hook
vi.mock('@/hooks/use-debounce', () => import('../__mocks__/use-debounce'));

describe('UpdateProfileForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders all form fields', () => {
      render(<UpdateProfileForm />);

      expect(screen.getByLabelText(/Display Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    });

    it('renders submit button', () => {
      render(<UpdateProfileForm />);
      expect(
        screen.getByRole('button', { name: /Save Changes/i }),
      ).toBeInTheDocument();
    });

    it('shows @ symbol prefix for username', () => {
      render(<UpdateProfileForm />);
      expect(screen.getByText('@')).toBeInTheDocument();
    });

    it('initializes with user data', () => {
      render(<UpdateProfileForm />);

      expect(screen.getByLabelText(/Display Name/i)).toHaveValue('Test User');
      expect(screen.getByLabelText(/Username/i)).toHaveValue('testuser');
    });
  });

  describe('username validation', () => {
    it('shows too short message for username less than 3 chars', async () => {
      const user = userEvent.setup();
      render(<UpdateProfileForm />);

      const usernameInput = screen.getByLabelText(/Username/i);
      await user.clear(usernameInput);
      await user.type(usernameInput, 'ab');

      expect(screen.getByText(/Too short/i)).toBeInTheDocument();
    });

    it('shows username requirements when username is changed', async () => {
      const user = userEvent.setup();
      render(<UpdateProfileForm />);

      const usernameInput = screen.getByLabelText(/Username/i);
      await user.clear(usernameInput);
      await user.type(usernameInput, 'newname');

      expect(
        screen.getByText(/Only lowercase letters, numbers, and underscores/i),
      ).toBeInTheDocument();
    });

    it('filters invalid characters from username', async () => {
      const user = userEvent.setup();
      render(<UpdateProfileForm />);

      const usernameInput = screen.getByLabelText(/Username/i);
      await user.clear(usernameInput);
      await user.type(usernameInput, 'Test@User!123');

      // Should only have lowercase letters and numbers
      expect(usernameInput).toHaveValue('testuser123');
    });

    it('shows available message when username is available', async () => {
      const { checkUsername } = await import('@/features/profile/api');
      const mockCheckUsername = vi.mocked(checkUsername);
      // Mock to always return available
      mockCheckUsername.mockResolvedValue({ available: true });

      const user = userEvent.setup();
      render(<UpdateProfileForm />);

      const usernameInput = screen.getByLabelText(/Username/i);
      await user.clear(usernameInput);
      await user.type(usernameInput, 'newusername');

      await waitFor(() => {
        expect(screen.getByText(/Username is available/i)).toBeInTheDocument();
      });
    });

    it('shows taken message when username is not available', async () => {
      const { checkUsername } = await import('@/features/profile/api');
      const mockCheckUsername = vi.mocked(checkUsername);
      // Mock to always return not available
      mockCheckUsername.mockResolvedValue({ available: false });

      const user = userEvent.setup();
      render(<UpdateProfileForm />);

      const usernameInput = screen.getByLabelText(/Username/i);
      await user.clear(usernameInput);
      await user.type(usernameInput, 'takenname');

      await waitFor(() => {
        expect(
          screen.getByText(/Username is already taken/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe('form submission', () => {
    it('calls updateProfile API on valid submission', async () => {
      const { updateProfile, checkUsername } = await import(
        '@/features/profile/api'
      );
      const mockUpdateProfile = vi.mocked(updateProfile);
      const mockCheckUsername = vi.mocked(checkUsername);

      mockCheckUsername.mockResolvedValue({ available: true });
      mockUpdateProfile.mockResolvedValueOnce({
        user: { ...mockUser, name: 'New Name' },
      });

      const user = userEvent.setup();
      render(<UpdateProfileForm />);

      const nameInput = screen.getByLabelText(/Display Name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');

      const submitButton = screen.getByRole('button', {
        name: /Save Changes/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          name: 'New Name',
          username: 'testuser',
        });
      });
    });

    it('shows success message after successful update', async () => {
      const { updateProfile, checkUsername } = await import(
        '@/features/profile/api'
      );
      const mockUpdateProfile = vi.mocked(updateProfile);
      const mockCheckUsername = vi.mocked(checkUsername);

      mockCheckUsername.mockResolvedValue({ available: true });
      mockUpdateProfile.mockResolvedValueOnce({
        user: { ...mockUser, name: 'New Name' },
      });

      const user = userEvent.setup();
      render(<UpdateProfileForm />);

      const nameInput = screen.getByLabelText(/Display Name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');

      const submitButton = screen.getByRole('button', {
        name: /Save Changes/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Profile updated successfully/i),
        ).toBeInTheDocument();
      });
    });

    it('calls updateUser after successful submission', async () => {
      const { updateProfile, checkUsername } = await import(
        '@/features/profile/api'
      );
      const mockUpdateProfile = vi.mocked(updateProfile);
      const mockCheckUsername = vi.mocked(checkUsername);

      const updatedUser = { ...mockUser, name: 'New Name' };
      mockCheckUsername.mockResolvedValue({ available: true });
      mockUpdateProfile.mockResolvedValueOnce({ user: updatedUser });

      const user = userEvent.setup();
      render(<UpdateProfileForm />);

      const nameInput = screen.getByLabelText(/Display Name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');

      const submitButton = screen.getByRole('button', {
        name: /Save Changes/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith(updatedUser);
      });
    });

    it('shows error message on API failure', async () => {
      const { updateProfile, checkUsername } = await import(
        '@/features/profile/api'
      );
      const mockUpdateProfile = vi.mocked(updateProfile);
      const mockCheckUsername = vi.mocked(checkUsername);

      mockCheckUsername.mockResolvedValue({ available: true });
      mockUpdateProfile.mockRejectedValueOnce(
        new Error('Failed to update profile'),
      );

      const user = userEvent.setup();
      render(<UpdateProfileForm />);

      const nameInput = screen.getByLabelText(/Display Name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');

      const submitButton = screen.getByRole('button', {
        name: /Save Changes/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Failed to update profile/i),
        ).toBeInTheDocument();
      });
    });

    it('disables submit when username is too short', async () => {
      const user = userEvent.setup();
      render(<UpdateProfileForm />);

      const usernameInput = screen.getByLabelText(/Username/i);
      await user.clear(usernameInput);
      await user.type(usernameInput, 'ab');

      const submitButton = screen.getByRole('button', {
        name: /Save Changes/i,
      });
      expect(submitButton).toBeDisabled();
    });

    it('disables submit when username is taken', async () => {
      const { checkUsername } = await import('@/features/profile/api');
      const mockCheckUsername = vi.mocked(checkUsername);
      // Mock to always return not available
      mockCheckUsername.mockResolvedValue({ available: false });

      const user = userEvent.setup();
      render(<UpdateProfileForm />);

      const usernameInput = screen.getByLabelText(/Username/i);
      await user.clear(usernameInput);
      await user.type(usernameInput, 'takenname');

      await waitFor(() => {
        expect(
          screen.getByText(/Username is already taken/i),
        ).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', {
        name: /Save Changes/i,
      });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('loading state', () => {
    it('disables submit button while loading', async () => {
      const { updateProfile, checkUsername } = await import(
        '@/features/profile/api'
      );
      const mockUpdateProfile = vi.mocked(updateProfile);
      const mockCheckUsername = vi.mocked(checkUsername);

      mockCheckUsername.mockResolvedValue({ available: true });

      // Create a promise that we can control
      let resolvePromise: (value: { user: User }) => void;
      mockUpdateProfile.mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
      );

      const user = userEvent.setup();
      render(<UpdateProfileForm />);

      const nameInput = screen.getByLabelText(/Display Name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');

      const submitButton = screen.getByRole('button', {
        name: /Save Changes/i,
      });
      await user.click(submitButton);

      // Button should be disabled during loading
      expect(submitButton).toBeDisabled();

      // Resolve the promise
      resolvePromise!({ user: { ...mockUser, name: 'New Name' } });
    });
  });

  describe('input fields', () => {
    it('name input is required', () => {
      render(<UpdateProfileForm />);
      expect(screen.getByLabelText(/Display Name/i)).toBeRequired();
    });

    it('updates name value on input', async () => {
      const user = userEvent.setup();
      render(<UpdateProfileForm />);

      const nameInput = screen.getByLabelText(/Display Name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');

      expect(nameInput).toHaveValue('New Name');
    });
  });
});
