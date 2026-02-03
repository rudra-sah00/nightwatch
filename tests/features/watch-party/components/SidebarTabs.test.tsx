import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SidebarTabs } from '@/features/watch-party/components/SidebarTabs';

describe('SidebarTabs', () => {
  const defaultProps = {
    activeTab: 'participants' as const,
    onTabChange: vi.fn(),
    participantCount: 5,
    unreadMessages: 0,
  };

  describe('rendering', () => {
    it('should render both tabs', () => {
      render(<SidebarTabs {...defaultProps} />);

      expect(screen.getByText('People')).toBeInTheDocument();
      expect(screen.getByText('Chat')).toBeInTheDocument();
    });

    it('should display participant count', () => {
      render(<SidebarTabs {...defaultProps} participantCount={10} />);

      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('should display participant count of 0 by not showing badge', () => {
      render(<SidebarTabs {...defaultProps} participantCount={0} />);

      // Count badge shouldn't be visible when 0
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('should highlight active participants tab', () => {
      render(<SidebarTabs {...defaultProps} activeTab="participants" />);

      const participantsButton = screen.getByText('People').closest('button');
      expect(participantsButton).toHaveClass('text-white');
    });

    it('should highlight active chat tab', () => {
      render(<SidebarTabs {...defaultProps} activeTab="chat" />);

      const chatButton = screen.getByText('Chat').closest('button');
      expect(chatButton).toHaveClass('text-white');
    });
  });

  describe('unread messages indicator', () => {
    it('should show unread badge when there are unread messages', () => {
      const { container } = render(
        <SidebarTabs {...defaultProps} unreadMessages={3} />,
      );

      // Should show pulse animation badge
      const pulseBadge = container.querySelector('.animate-pulse');
      expect(pulseBadge).toBeInTheDocument();
    });

    it('should not show unread badge when no unread messages', () => {
      const { container } = render(
        <SidebarTabs {...defaultProps} unreadMessages={0} />,
      );

      const pulseBadge = container.querySelector('.animate-pulse');
      expect(pulseBadge).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onTabChange with "chat" when chat tab is clicked', () => {
      const onTabChange = vi.fn();
      render(<SidebarTabs {...defaultProps} onTabChange={onTabChange} />);

      const chatButton = screen.getByText('Chat').closest('button');
      fireEvent.click(chatButton!);

      expect(onTabChange).toHaveBeenCalledWith('chat');
    });

    it('should call onTabChange with "participants" when participants tab is clicked', () => {
      const onTabChange = vi.fn();
      render(
        <SidebarTabs
          {...defaultProps}
          activeTab="chat"
          onTabChange={onTabChange}
        />,
      );

      const participantsButton = screen.getByText('People').closest('button');
      fireEvent.click(participantsButton!);

      expect(onTabChange).toHaveBeenCalledWith('participants');
    });

    it('should call onTabChange even when clicking already active tab', () => {
      const onTabChange = vi.fn();
      render(
        <SidebarTabs
          {...defaultProps}
          activeTab="participants"
          onTabChange={onTabChange}
        />,
      );

      const participantsButton = screen.getByText('People').closest('button');
      fireEvent.click(participantsButton!);

      expect(onTabChange).toHaveBeenCalledWith('participants');
    });
  });

  describe('edge cases', () => {
    it('should handle large participant counts', () => {
      render(<SidebarTabs {...defaultProps} participantCount={999} />);

      expect(screen.getByText('999')).toBeInTheDocument();
    });

    it('should handle undefined unreadMessages', () => {
      render(<SidebarTabs {...defaultProps} unreadMessages={undefined} />);

      // Should render without errors
      expect(screen.getByText('People')).toBeInTheDocument();
      expect(screen.getByText('Chat')).toBeInTheDocument();
    });
  });
});
