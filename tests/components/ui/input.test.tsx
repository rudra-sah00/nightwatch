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

  it('does not render helper paragraph by default', () => {
    const { container } = render(<Input />);
    expect(container.querySelector('p')).not.toBeInTheDocument();
  });

  it('does not apply destructive border class', () => {
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

  it('renders with base input styling', () => {
    render(<Input data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveClass('border-b-4');
  });
});
