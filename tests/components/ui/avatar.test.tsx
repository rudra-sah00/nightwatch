import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Avatar } from '@/components/ui/avatar';

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ fill, unoptimized, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="Avatar" {...props} />;
  },
}));

describe('Avatar', () => {
  it('should render image when src is provided', () => {
    render(<Avatar src="https://example.com/avatar.jpg" alt="User Avatar" />);
    const img = screen.getByAltText('User Avatar');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('should render fallback when src is not provided', () => {
    render(<Avatar fallback={<span>FB</span>} />);
    expect(screen.getByText('FB')).toBeInTheDocument();
  });

  it('should render user icon as default fallback', () => {
    const { container } = render(<Avatar />);
    const icon = container.querySelector('.lucide-user');
    expect(icon).toBeInTheDocument();
  });

  it('should show fallback when image fails to load', () => {
    render(
      <Avatar
        src="https://example.com/broken.jpg"
        alt="Broken Avatar"
        fallback={<span data-testid="fallback">FB</span>}
      />,
    );

    const img = screen.getByAltText('Broken Avatar');
    expect(img).toBeInTheDocument();

    // Simulate error
    fireEvent.error(img);

    // Image should be gone (logic in Avatar is src && !hasError)
    expect(screen.queryByAltText('Broken Avatar')).not.toBeInTheDocument();
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<Avatar className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
