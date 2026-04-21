import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PendingRequests } from '@/features/watch-party/components/PendingRequests';
import type { RoomMember } from '@/features/watch-party/room/types';

describe('PendingRequests', () => {
  const mockPendingMembers: RoomMember[] = [
    {
      id: 'user-1',
      name: 'John Doe',
      isHost: false,
      joinedAt: Date.now(),
      profilePhoto: 'https://example.com/avatar1.jpg',
    },
    {
      id: 'user-2',
      name: 'Jane Smith',
      isHost: false,
      joinedAt: Date.now(),
      profilePhoto: undefined,
    },
    {
      id: 'user-3',
      name: 'Bob Wilson',
      isHost: false,
      joinedAt: Date.now(),
    },
  ];

  const defaultProps = {
    pendingMembers: mockPendingMembers,
    onApprove: vi.fn(),
    onReject: vi.fn(),
  };

  describe('rendering', () => {
    it('should render nothing when no pending members', () => {
      const { container } = render(
        <PendingRequests {...defaultProps} pendingMembers={[]} />,
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render pending members count', () => {
      render(<PendingRequests {...defaultProps} />);

      expect(screen.getByText('waitingToJoin')).toBeInTheDocument();
    });

    it('should render single member count correctly', () => {
      render(
        <PendingRequests
          {...defaultProps}
          pendingMembers={[mockPendingMembers[0]]}
        />,
      );

      expect(screen.getByText('waitingToJoin')).toBeInTheDocument();
    });

    it('should render all pending member names', () => {
      render(<PendingRequests {...defaultProps} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });

    it('should render profile photos when available', () => {
      render(<PendingRequests {...defaultProps} />);

      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(1); // Only John Doe has a profile photo
      expect(images[0]).toHaveAttribute(
        'src',
        'https://example.com/avatar1.jpg',
      );
    });

    it('should render avatar fallback with first letter when no photo', () => {
      render(<PendingRequests {...defaultProps} />);

      // Jane Smith and Bob Wilson should have fallback avatars
      expect(screen.getByText('J')).toBeInTheDocument(); // Jane
      expect(screen.getByText('B')).toBeInTheDocument(); // Bob
    });

    it('should render approve and reject buttons for each member', () => {
      render(<PendingRequests {...defaultProps} />);

      const approveButtons = screen.getAllByTitle('approve');
      const rejectButtons = screen.getAllByTitle('reject');

      expect(approveButtons).toHaveLength(3);
      expect(rejectButtons).toHaveLength(3);
    });
  });

  describe('interactions', () => {
    it('should call onApprove with user id when approve button clicked', () => {
      const onApprove = vi.fn();
      render(<PendingRequests {...defaultProps} onApprove={onApprove} />);

      const approveButtons = screen.getAllByTitle('approve');
      fireEvent.click(approveButtons[0]);

      expect(onApprove).toHaveBeenCalledWith('user-1');
    });

    it('should call onReject with user id when reject button clicked', () => {
      const onReject = vi.fn();
      render(<PendingRequests {...defaultProps} onReject={onReject} />);

      const rejectButtons = screen.getAllByTitle('reject');
      fireEvent.click(rejectButtons[1]);

      expect(onReject).toHaveBeenCalledWith('user-2');
    });

    it('should call correct callbacks for different members', () => {
      const onApprove = vi.fn();
      const onReject = vi.fn();
      render(
        <PendingRequests
          {...defaultProps}
          onApprove={onApprove}
          onReject={onReject}
        />,
      );

      const approveButtons = screen.getAllByTitle('approve');
      const rejectButtons = screen.getAllByTitle('reject');

      // Approve first, reject second, approve third
      fireEvent.click(approveButtons[0]);
      fireEvent.click(rejectButtons[1]);
      fireEvent.click(approveButtons[2]);

      expect(onApprove).toHaveBeenCalledTimes(2);
      expect(onApprove).toHaveBeenNthCalledWith(1, 'user-1');
      expect(onApprove).toHaveBeenNthCalledWith(2, 'user-3');
      expect(onReject).toHaveBeenCalledTimes(1);
      expect(onReject).toHaveBeenCalledWith('user-2');
    });
  });

  describe('edge cases', () => {
    it('should handle member with empty name', () => {
      const membersWithEmptyName: RoomMember[] = [
        {
          id: 'user-empty',
          name: '',
          isHost: false,
          joinedAt: Date.now(),
        },
      ];

      render(
        <PendingRequests
          {...defaultProps}
          pendingMembers={membersWithEmptyName}
        />,
      );

      // Should still render the approve/reject buttons
      expect(screen.getByTitle('approve')).toBeInTheDocument();
      expect(screen.getByTitle('reject')).toBeInTheDocument();
    });

    it('should handle member with very long name', () => {
      const membersWithLongName: RoomMember[] = [
        {
          id: 'user-long',
          name: 'This is a very very very very very very long name that should be truncated',
          isHost: false,
          joinedAt: Date.now(),
        },
      ];

      render(
        <PendingRequests
          {...defaultProps}
          pendingMembers={membersWithLongName}
        />,
      );

      expect(screen.getByText(/This is a very/)).toBeInTheDocument();
    });

    it('should handle many pending members', () => {
      const manyMembers: RoomMember[] = Array.from({ length: 20 }, (_, i) => ({
        id: `user-${i}`,
        name: `User ${i}`,
        isHost: false,
        joinedAt: Date.now(),
      }));

      render(
        <PendingRequests {...defaultProps} pendingMembers={manyMembers} />,
      );

      expect(screen.getByText('waitingToJoin')).toBeInTheDocument();
      // Container should be scrollable
      expect(screen.getAllByTitle('approve')).toHaveLength(20);
    });
  });
});
