import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from '@/components/ui/input';

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('applies type attribute', () => {
    render(<Input type="email" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'email');
  });

  it('passes placeholder prop', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Input className="custom-input" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveClass('custom-input');
  });

  it('shows error message when error prop is provided', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('does not show error element when error prop is absent', () => {
    const { container } = render(<Input />);
    expect(container.querySelector('p')).not.toBeInTheDocument();
  });

  it('applies error border class when error is set', () => {
    render(<Input error="Required" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveClass('border-destructive');
  });

  it('does not apply error border class when no error', () => {
    render(<Input data-testid="input" />);
    expect(screen.getByTestId('input')).not.toHaveClass('border-destructive');
  });

  it('supports disabled state', () => {
    render(<Input disabled data-testid="input" />);
    expect(screen.getByTestId('input')).toBeDisabled();
  });

  it('supports value prop', () => {
    render(<Input defaultValue="hello" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveValue('hello');
  });

  it('renders error text in destructive color class', () => {
    const { container } = render(<Input error="Bad value" />);
    const errorP = container.querySelector('p');
    expect(errorP).toHaveClass('text-destructive');
  });
});
