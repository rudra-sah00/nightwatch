import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateProfileForm } from '@/features/profile/components/update-profile-form';
import { useProfileOverview } from '@/features/profile/hooks/use-profile-overview';
import { useAuth } from '@/providers/auth-provider';
import type { User } from '@/types';

// Mock user
const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  username: 'testuser',
  profilePhoto: null,
  preferredServer: 's1' as 's1' | 's2',
  sessionId: 'session-123',
  createdAt: new Date().toISOString(),
};

// Mock useAuth hook
const mockUpdateUser = vi.fn();
vi.mock('@/providers/auth-provider', () => ({
  useAuth: vi.fn(),
}));

// Mock profile overview hook to keep tests deterministic and avoid unrelated async updates
vi.mock('@/features/profile/hooks/use-profile-overview', () => ({
  useProfileOverview: vi.fn(),
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
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      updateUser: mockUpdateUser,
    } as unknown as ReturnType<typeof useAuth>);

    vi.mocked(useProfileOverview).mockReturnValue({
      user: mockUser,
      logout: vi.fn(),
      activity: [],
      loadingActivity: false,
      isUploading: false,
      displayImage: null,
      fileInputRef: { current: null },
      formattedJoinDate: 'January 2025',
      handleFileClick: vi.fn(),
      handleFileChange: vi.fn(),
    });
  });

  describe('rendering', () => {
    it('renders all form fields', () => {
      render(<UpdateProfileForm />);

      expect(
        screen.getByLabelText(/updateForm\.displayName/i),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/updateForm\.username/i),
      ).toBeInTheDocument();
    });

    it('renders submit button', () => {
      render(<UpdateProfileForm />);
      expect(
        screen.getByRole('button', { name: /updateForm\.saveChanges/i }),
      ).toBeInTheDocument();
    });

    it('shows @ symbol prefix for username', () => {
      render(<UpdateProfileForm />);
      expect(screen.getAllByText('@').length).toBeGreaterThan(0);
    });

    it('initializes with user data', () => {
      render(<UpdateProfileForm />);

      expect(screen.getByLabelText(/updateForm\.displayName/i)).toHaveValue(
        'Test User',
      );
      expect(screen.getByLabelText(/updateForm\.username/i)).toHaveValue(
        'testuser',
      );
    });
  });

  describe('username validation', () => {
    it('shows too short message for username less than 3 chars', async () => {
      const user = userEvent.setup();
      render(<UpdateProfileForm />);

      const usernameInput = screen.getByLabelText(/updateForm\.username/i);
      await user.clear(usernameInput);
      await user.type(usernameInput, 'ab');

      expect(screen.getByText(/updateForm\.minChars/i)).toBeInTheDocument();
    });

    it('filters invalid characters from username', async () => {
      const user = userEvent.setup();
      render(<UpdateProfileForm />);

      const usernameInput = screen.getByLabelText(/updateForm\.username/i);
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

      const usernameInput = screen.getByLabelText(/updateForm\.username/i);
      await user.clear(usernameInput);
      await user.type(usernameInput, 'newusername');

      await waitFor(() => {
        expect(screen.getByText(/updateForm\.available/i)).toBeInTheDocument();
      });
    });

    it('shows taken message when username is not available', async () => {
      const { checkUsername } = await import('@/features/profile/api');
      const mockCheckUsername = vi.mocked(checkUsername);
      // Mock to always return not available
      mockCheckUsername.mockResolvedValue({ available: false });

      const user = userEvent.setup();
      render(<UpdateProfileForm />);

      const usernameInput = screen.getByLabelText(/updateForm\.username/i);
      await user.clear(usernameInput);
      await user.type(usernameInput, 'takenname');

      await waitFor(() => {
        expect(
          screen.getByText(/updateForm\.alreadyTaken/i),
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

      const nameInput = screen.getByLabelText(/updateForm\.displayName/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');

      const submitButton = screen.getByRole('button', {
        name: /updateForm\.saveChanges/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          name: 'New Name',
          preferredServer: 's1',
          username: 'testuser',
        });
      });
    });

    it('shows toast notification after successful update', async () => {
      const { updateProfile, checkUsername } = await import(
        '@/features/profile/api'
      );
      const { toast } = await import('sonner');
      const mockUpdateProfile = vi.mocked(updateProfile);
      const mockCheckUsername = vi.mocked(checkUsername);

      mockCheckUsername.mockResolvedValue({ available: true });
      mockUpdateProfile.mockResolvedValueOnce({
        user: { ...mockUser, name: 'New Name' },
      });

      const user = userEvent.setup();
      render(<UpdateProfileForm />);

      const nameInput = screen.getByLabelText(/updateForm\.displayName/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');

      const submitButton = screen.getByRole('button', {
        name: /updateForm\.saveChanges/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(vi.mocked(toast.success)).toHaveBeenCalledWith(
          'messages.profileUpdated',
        );
      });
      expect(
        screen.queryByText(/messages\.profileUpdated/i),
      ).not.toBeInTheDocument();
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

      const nameInput = screen.getByLabelText(/updateForm\.displayName/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');

      const submitButton = screen.getByRole('button', {
        name: /updateForm\.saveChanges/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith(updatedUser);
      });
    });

    it('allows server change when user has no username set', async () => {
      const { updateProfile } = await import('@/features/profile/api');
      const mockUpdateProfile = vi.mocked(updateProfile);

      const noUsernameUser: User = {
        ...mockUser,
        username: null as unknown as string,
        preferredServer: 's1',
      };
      vi.mocked(useAuth).mockReturnValue({
        user: noUsernameUser,
        updateUser: mockUpdateUser,
      } as unknown as ReturnType<typeof useAuth>);

      mockUpdateProfile.mockResolvedValueOnce({
        user: { ...noUsernameUser, preferredServer: 's2' },
      });

      const user = userEvent.setup();
      render(<UpdateProfileForm />);

      const server2Button = screen.getByRole('radio', {
        name: /serverSelection\.balanced/i,
      });
      await user.click(server2Button);

      const submitButton = screen.getByRole('button', {
        name: /updateForm\.saveChanges/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          name: 'Test User',
          username: undefined,
          preferredServer: 's2',
        });
      });
    });

    it('shows error message on API failure', async () => {
      const { updateProfile, checkUsername } = await import(
        '@/features/profile/api'
      );
      const { toast } = await import('sonner');
      const mockUpdateProfile = vi.mocked(updateProfile);
      const mockCheckUsername = vi.mocked(checkUsername);

      mockCheckUsername.mockResolvedValue({ available: true });
      mockUpdateProfile.mockRejectedValueOnce(
        new Error('Failed to update profile'),
      );

      const user = userEvent.setup();
      render(<UpdateProfileForm />);

      const nameInput = screen.getByLabelText(/updateForm\.displayName/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');

      const submitButton = screen.getByRole('button', {
        name: /updateForm\.saveChanges/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
          'Failed to update profile',
        );
      });
    });

    it('disables submit when username is too short', async () => {
      const user = userEvent.setup();
      render(<UpdateProfileForm />);

      const usernameInput = screen.getByLabelText(/updateForm\.username/i);
      await user.clear(usernameInput);
      await user.type(usernameInput, 'ab');

      const submitButton = screen.getByRole('button', {
        name: /updateForm\.saveChanges/i,
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

      const usernameInput = screen.getByLabelText(/updateForm\.username/i);
      await user.clear(usernameInput);
      await user.type(usernameInput, 'takenname');

      await waitFor(() => {
        expect(
          screen.getByText(/updateForm\.alreadyTaken/i),
        ).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', {
        name: /updateForm\.saveChanges/i,
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

      const nameInput = screen.getByLabelText(/updateForm\.displayName/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');

      const submitButton = screen.getByRole('button', {
        name: /updateForm\.saveChanges/i,
      });
      await user.click(submitButton);

      // Button should be disabled during loading
      expect(submitButton).toBeDisabled();

      // Resolve the promise
      resolvePromise!({ user: { ...mockUser, name: 'New Name' } });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('public profile sharing', () => {
    it('copies public link and shows success toast', async () => {
      const { toast } = await import('sonner');
      const copyFn = (
        window as unknown as {
          electronAPI: { copyToClipboard: ReturnType<typeof vi.fn> };
        }
      ).electronAPI.copyToClipboard;

      const user = userEvent.setup();
      render(<UpdateProfileForm />);

      await user.click(
        screen.getByRole('button', { name: /publicIdentity\.copyLink/i }),
      );

      await waitFor(() => {
        expect(copyFn).toHaveBeenCalled();
        expect(vi.mocked(toast.success)).toHaveBeenCalledWith(
          'updateForm.publicLinkCopied',
        );
      });
    });
  });

  describe('input fields', () => {
    it('name input is required', () => {
      render(<UpdateProfileForm />);
      expect(screen.getByLabelText(/updateForm\.displayName/i)).toBeRequired();
    });

    it('updates name value on input', async () => {
      const user = userEvent.setup();
      render(<UpdateProfileForm />);

      const nameInput = screen.getByLabelText(/updateForm\.displayName/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');

      expect(nameInput).toHaveValue('New Name');
    });
  });

  describe('Account Deletion', () => {
    it('renders Danger Zone and opens confirmation dialog', async () => {
      const user = userEvent.setup();
      render(<UpdateProfileForm />);

      // Find Danger Zone button
      const deleteButton = screen.getByRole('button', {
        name: /dangerZone\.deleteAccount/i,
      });
      expect(deleteButton).toBeInTheDocument();

      // Click to open dialog
      await user.click(deleteButton);

      // Verify dialog content
      expect(screen.getByText('dangerZone.dialogTitle')).toBeInTheDocument();
      expect(
        screen.getByText(/dangerZone\.dialogDescription/i),
      ).toBeInTheDocument();

      // Verify cancel button
      const cancelButton = screen.getByRole('button', {
        name: /dangerZone\.cancel/i,
      });
      expect(cancelButton).toBeInTheDocument();

      // Verify confirm button
      const confirmButton = screen.getByRole('button', {
        name: /dangerZone\.confirmDelete/i,
      });
      expect(confirmButton).toBeInTheDocument();

      // Click cancel should close dialog
      await user.click(cancelButton);
      await waitFor(() => {
        expect(
          screen.queryByText('dangerZone.dialogTitle'),
        ).not.toBeInTheDocument();
      });
    });

    it('calls deleteAccount and handles success', async () => {
      const user = userEvent.setup();
      const mockLogout = vi.fn();
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        updateUser: mockUpdateUser,
        logout: mockLogout,
      } as unknown as ReturnType<typeof useAuth>);

      const { deleteAccount } = await import('@/features/profile/api');
      const { toast } = await import('sonner');
      vi.mocked(deleteAccount).mockResolvedValueOnce(undefined);

      render(<UpdateProfileForm />);

      // Open dialog and confirm
      await user.click(
        screen.getByRole('button', { name: /dangerZone\.deleteAccount/i }),
      );
      await user.click(
        screen.getByRole('button', { name: /dangerZone\.confirmDelete/i }),
      );

      // Wait for success actions
      await waitFor(() => {
        expect(deleteAccount).toHaveBeenCalled();
        expect(mockLogout).toHaveBeenCalled();
        expect(vi.mocked(toast.success)).toHaveBeenCalledWith(
          'messages.accountDeleted',
        );
      });
    });

    it('shows error toast on deletion failure', async () => {
      const user = userEvent.setup();

      const { deleteAccount } = await import('@/features/profile/api');
      const { toast } = await import('sonner');
      vi.mocked(deleteAccount).mockRejectedValueOnce(
        new Error('Failed to delete account'),
      );

      render(<UpdateProfileForm />);

      // Open dialog and confirm
      await user.click(
        screen.getByRole('button', { name: /dangerZone\.deleteAccount/i }),
      );
      await user.click(
        screen.getByRole('button', { name: /dangerZone\.confirmDelete/i }),
      );

      // Wait for error actions
      await waitFor(() => {
        expect(deleteAccount).toHaveBeenCalled();
        expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
          'Failed to delete account',
        );
      });
    });
  });
});
