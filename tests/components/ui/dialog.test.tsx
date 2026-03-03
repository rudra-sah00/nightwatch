import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

function TestDialog({
  open = false,
  showCloseButton,
  footerCloseButton,
}: {
  open?: boolean;
  showCloseButton?: boolean;
  footerCloseButton?: boolean;
}) {
  return (
    <Dialog open={open}>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent showCloseButton={showCloseButton}>
        <DialogHeader>
          <DialogTitle>Test Title</DialogTitle>
          <DialogDescription>Test description</DialogDescription>
        </DialogHeader>
        <p>Dialog body</p>
        <DialogFooter showCloseButton={footerCloseButton}>
          <span>Footer</span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

describe('Dialog', () => {
  it('does not render content when closed', () => {
    render(<TestDialog open={false} />);
    expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
  });

  it('renders content when open', () => {
    render(<TestDialog open={true} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('Dialog body')).toBeInTheDocument();
  });

  it('renders DialogHeader and DialogFooter', () => {
    render(<TestDialog open={true} />);
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('renders close button by default (showCloseButton=undefined)', () => {
    render(<TestDialog open={true} />);
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('does not render close button when showCloseButton=false', () => {
    render(<TestDialog open={true} showCloseButton={false} />);
    expect(
      screen.queryByRole('button', { name: /^close$/i }),
    ).not.toBeInTheDocument();
  });

  it('renders footer close button when footerCloseButton=true', () => {
    render(
      <TestDialog
        open={true}
        showCloseButton={false}
        footerCloseButton={true}
      />,
    );
    const closeButtons = screen.getAllByRole('button', { name: /close/i });
    expect(closeButtons.length).toBeGreaterThan(0);
  });

  it('DialogHeader renders as div with correct slot', () => {
    const { container } = render(
      <DialogHeader>
        <span>H</span>
      </DialogHeader>,
    );
    const el = container.querySelector('[data-slot="dialog-header"]');
    expect(el).toBeInTheDocument();
  });

  it('DialogFooter renders as div with correct slot', () => {
    const { container } = render(
      <DialogFooter>
        <span>F</span>
      </DialogFooter>,
    );
    const el = container.querySelector('[data-slot="dialog-footer"]');
    expect(el).toBeInTheDocument();
  });

  it('DialogClose renders correctly', () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <DialogClose data-testid="close-btn">Close me</DialogClose>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByTestId('close-btn')).toBeInTheDocument();
  });

  it('fires onOpenChange when trigger is clicked', () => {
    render(
      <Dialog>
        <DialogTrigger data-testid="trigger">Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Hi</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    const trigger = screen.getByTestId('trigger');
    fireEvent.click(trigger);
    expect(screen.getByText('Hi')).toBeInTheDocument();
  });
});
