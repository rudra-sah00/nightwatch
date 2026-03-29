import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CreatorFooter } from '@/components/creator-footer';

describe('CreatorFooter', () => {
  it('renders the Creator Identity badge', () => {
    render(<CreatorFooter />);
    expect(screen.getByText(/Creator Identity/i)).toBeInTheDocument();
  });

  it('renders all four social links with correct URLs', () => {
    render(<CreatorFooter />);

    const instagram = screen.getByRole('link', { name: /Instagram/i });
    const linkedin = screen.getByRole('link', { name: /LinkedIn/i });
    const github = screen.getByRole('link', { name: /GitHub/i });
    const x = screen.getByRole('link', { name: /X \(Twitter\)/i });

    expect(instagram).toHaveAttribute(
      'href',
      'https://www.instagram.com/rudra.sah00/',
    );
    expect(linkedin).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/rudra-narayana-sahoo-695342288/',
    );
    expect(github).toHaveAttribute('href', 'https://github.com/rudra-sah00');
    expect(x).toHaveAttribute('href', 'https://x.com/rudrasah00');
  });

  it('applies compact styling when isCompact prop is true', () => {
    const { container } = render(<CreatorFooter isCompact />);
    const footerDiv = container.querySelector('#creator-footer');
    expect(footerDiv).toHaveClass('mt-4');
    expect(footerDiv).toHaveClass('pt-4');
  });

  it('applies standard styling when isCompact prop is false', () => {
    const { container } = render(<CreatorFooter isCompact={false} />);
    const footerDiv = container.querySelector('#creator-footer');
    expect(footerDiv).toHaveClass('mt-12');
    expect(footerDiv).toHaveClass('pt-12');
  });
});
