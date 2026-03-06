import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SidebarTabs } from '@/features/watch-party/components/SidebarTabs';

describe('SidebarTabs', () => {
  const defaultProps = {
    activeTab: 'participants' as const,
    onTabChange: vi.fn(),
    unreadMessages: 0,
  };

  describe('rendering', () => {
    it('should render all four tabs (participants, chat, soundboard, sketch)', () => {
      render(<SidebarTabs {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(4);
    });

    it('should highlight active participants tab', () => {
      render(<SidebarTabs {...defaultProps} activeTab="participants" />);

      const buttons = screen.getAllByRole('button');
      // The first button is participants/people
      expect(buttons[0]).toHaveClass('text-white');
    });

    it('should highlight active chat tab', () => {
      render(<SidebarTabs {...defaultProps} activeTab="chat" />);

      const buttons = screen.getAllByRole('button');
      // The second button is chat
      expect(buttons[1]).toHaveClass('text-white');
    });
  });

  describe('unread messages indicator', () => {
    it('should show unread badge when there are unread messages', () => {
      render(<SidebarTabs {...defaultProps} unreadMessages={3} />);

      // Badge shows numeric count
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should not show unread badge when no unread messages', () => {
      const { container } = render(
        <SidebarTabs {...defaultProps} unreadMessages={0} />,
      );

      // No badge span rendered at all
      expect(container.querySelector('span[style]')).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onTabChange with "chat" when chat tab is clicked', () => {
      const onTabChange = vi.fn();
      render(<SidebarTabs {...defaultProps} onTabChange={onTabChange} />);

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]); // Chat is 2nd

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

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]); // Participants is 1st

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

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]);

      expect(onTabChange).toHaveBeenCalledWith('participants');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined unreadMessages', () => {
      render(<SidebarTabs {...defaultProps} unreadMessages={undefined} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(4);
    });
  });
});
