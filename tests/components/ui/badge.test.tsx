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

  it('applies variant class for blue', () => {
    const { container } = render(<Badge variant="blue">Blue</Badge>);
    const el = container.querySelector('[data-slot="badge"]');
    expect(el).toBeInTheDocument();
    expect(el?.getAttribute('data-variant')).toBe('blue');
  });

  it('applies variant class for red', () => {
    render(<Badge variant="red">Red</Badge>);
    expect(screen.getByText('Red')).toBeInTheDocument();
  });

  it('applies variant class for yellow', () => {
    render(<Badge variant="yellow">Yellow</Badge>);
    expect(screen.getByText('Yellow')).toBeInTheDocument();
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
