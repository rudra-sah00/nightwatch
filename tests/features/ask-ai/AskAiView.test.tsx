import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AskAiError, AskAiMessage } from '@/features/ask-ai/types';

const mockUseAskAi = vi.fn();

vi.mock('@/features/ask-ai/hooks/use-ask-ai', () => ({
  useAskAi: () => mockUseAskAi(),
}));

vi.mock('@/components/layout/page-title', () => ({
  PageTitle: () => null,
}));

import { AskAiView } from '@/features/ask-ai/components/AskAiView';

interface Overrides {
  state?: 'idle' | 'listening' | 'speaking';
  messages?: AskAiMessage[];
  liveUserText?: string;
  liveAssistantText?: string;
  error?: AskAiError | null;
}

function setup(overrides: Overrides = {}) {
  mockUseAskAi.mockReturnValue({
    state: 'idle',
    messages: [],
    liveUserText: '',
    liveAssistantText: '',
    error: null,
    start: vi.fn(),
    stop: vi.fn(),
    clearHistory: vi.fn(),
    ...overrides,
  });
  return render(<AskAiView />);
}

beforeEach(() => {
  mockUseAskAi.mockReset();
});

describe('AskAiView — accessibility', () => {
  it('exposes the transcript as a polite live region', () => {
    // Without this a voice feature conveys nothing to assistive tech.
    const { container } = setup();
    const log = container.querySelector('[role="log"]');
    expect(log).toBeInTheDocument();
    expect(log).toHaveAttribute('aria-live', 'polite');
    // Append-only: only new turns should be announced.
    expect(log).toHaveAttribute('aria-relevant', 'additions text');
  });

  it('announces the listening/speaking status', () => {
    setup({ state: 'listening' });
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('askAi.listening');
  });

  it('labels the orb by action', () => {
    setup({ state: 'idle' });
    expect(
      screen.getByRole('button', { name: 'askAi.startConversation' }),
    ).toBeInTheDocument();

    setup({ state: 'speaking' });
    expect(
      screen.getByRole('button', { name: 'askAi.stopConversation' }),
    ).toBeInTheDocument();
  });
});

describe('AskAiView — conversation history', () => {
  it('renders every turn, not just the latest', () => {
    setup({
      messages: [
        { id: '1', role: 'user', content: 'play something upbeat' },
        { id: '2', role: 'assistant', content: 'Playing it now.' },
        { id: '3', role: 'user', content: 'next' },
      ],
    });

    expect(screen.getByText('play something upbeat')).toBeInTheDocument();
    expect(screen.getByText('Playing it now.')).toBeInTheDocument();
    expect(screen.getByText('next')).toBeInTheDocument();
  });

  it('shows an empty state before anything is said', () => {
    setup();
    expect(screen.getByText('askAi.emptyConversation')).toBeInTheDocument();
  });

  it('renders in-progress captions alongside history', () => {
    setup({
      messages: [{ id: '1', role: 'user', content: 'earlier turn' }],
      liveAssistantText: 'still speak',
    });
    expect(screen.getByText('earlier turn')).toBeInTheDocument();
    expect(screen.getByText('still speak')).toBeInTheDocument();
    expect(
      screen.queryByText('askAi.emptyConversation'),
    ).not.toBeInTheDocument();
  });

  it('only offers Clear once there is history', () => {
    setup();
    expect(screen.queryByText('askAi.clearHistory')).not.toBeInTheDocument();

    setup({ messages: [{ id: '1', role: 'user', content: 'hi' }] });
    expect(screen.getByText('askAi.clearHistory')).toBeInTheDocument();
  });
});

describe('AskAiView — errors', () => {
  it('translates the error code instead of printing English', () => {
    setup({ error: { code: 'micDenied' } });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('askAi.errors.micDenied');
  });

  it('never shows the raw upstream detail', () => {
    setup({
      error: { code: 'serverError', detail: 'ValidationException: raw detail' },
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'askAi.errors.serverError',
    );
    expect(screen.queryByText(/ValidationException/)).not.toBeInTheDocument();
  });

  it('renders no alert when there is no error', () => {
    setup();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
