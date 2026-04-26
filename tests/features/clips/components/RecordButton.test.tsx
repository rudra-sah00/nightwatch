import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RecordButton } from '@/features/clips/components/RecordButton';

describe('RecordButton', () => {
  it('renders idle state with "Clip" label', () => {
    render(
      <RecordButton
        isRecording={false}
        duration={0}
        canStop={false}
        onStart={vi.fn()}
        onStop={vi.fn()}
      />,
    );
    expect(screen.getByText('Clip')).toBeInTheDocument();
  });

  it('calls onStart when clicked in idle state', async () => {
    const onStart = vi.fn();
    render(
      <RecordButton
        isRecording={false}
        duration={0}
        canStop={false}
        onStart={onStart}
        onStop={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByText('Clip'));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('renders recording state with REC label and timer', () => {
    render(
      <RecordButton
        isRecording={true}
        duration={65}
        canStop={true}
        onStart={vi.fn()}
        onStop={vi.fn()}
      />,
    );
    expect(screen.getByText('REC 1:05')).toBeInTheDocument();
  });

  it('calls onStop when clicked in recording state with canStop=true', async () => {
    const onStop = vi.fn();
    render(
      <RecordButton
        isRecording={true}
        duration={10}
        canStop={true}
        onStart={vi.fn()}
        onStop={onStop}
      />,
    );
    await userEvent.click(screen.getByText(/REC/));
    expect(onStop).toHaveBeenCalledOnce();
  });

  it('disables stop button when canStop=false (under 5 seconds)', () => {
    render(
      <RecordButton
        isRecording={true}
        duration={3}
        canStop={false}
        onStart={vi.fn()}
        onStop={vi.fn()}
      />,
    );
    const button = screen.getByText(/REC/).closest('button');
    expect(button).toBeDisabled();
  });

  it('formats duration correctly for 0 seconds', () => {
    render(
      <RecordButton
        isRecording={true}
        duration={0}
        canStop={false}
        onStart={vi.fn()}
        onStop={vi.fn()}
      />,
    );
    expect(screen.getByText('REC 0:00')).toBeInTheDocument();
  });

  it('formats duration correctly for 5 minutes', () => {
    render(
      <RecordButton
        isRecording={true}
        duration={300}
        canStop={true}
        onStart={vi.fn()}
        onStop={vi.fn()}
      />,
    );
    expect(screen.getByText('REC 5:00')).toBeInTheDocument();
  });
});
