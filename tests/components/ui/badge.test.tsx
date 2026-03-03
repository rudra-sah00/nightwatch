import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  it('renders with default variant', () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('renders as a span by default', () => {
    const { container } = render(<Badge>Label</Badge>);
    expect(container.querySelector('span')).toBeInTheDocument();
  });

  it('applies variant class for secondary', () => {
    const { container } = render(<Badge variant="secondary">Sec</Badge>);
    const el = container.querySelector('[data-slot="badge"]');
    expect(el).toBeInTheDocument();
    expect(el?.getAttribute('data-variant')).toBe('secondary');
  });

  it('applies variant class for destructive', () => {
    render(<Badge variant="destructive">Error</Badge>);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('applies variant class for outline', () => {
    render(<Badge variant="outline">Outline</Badge>);
    expect(screen.getByText('Outline')).toBeInTheDocument();
  });

  it('applies variant class for ghost', () => {
    render(<Badge variant="ghost">Ghost</Badge>);
    expect(screen.getByText('Ghost')).toBeInTheDocument();
  });

  it('applies variant class for link', () => {
    render(<Badge variant="link">Link</Badge>);
    expect(screen.getByText('Link')).toBeInTheDocument();
  });

  it('renders as child element when asChild is true', () => {
    render(
      <Badge asChild>
        <a href="/test">Link Badge</a>
      </Badge>,
    );
    const link = screen.getByRole('link', { name: 'Link Badge' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
  });

  it('applies custom className', () => {
    const { container } = render(<Badge className="custom-class">Test</Badge>);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('passes through extra props', () => {
    render(
      <Badge data-testid="my-badge" aria-label="status">
        New
      </Badge>,
    );
    const badge = screen.getByTestId('my-badge');
    expect(badge).toHaveAttribute('aria-label', 'status');
  });
});
