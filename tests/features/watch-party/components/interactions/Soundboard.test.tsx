import { fireEvent, render, screen } from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  emitPartyInteraction,
  onPartyInteraction,
} from '@/features/watch-party/api';
import { Soundboard } from '@/features/watch-party/components/interactions/Soundboard';
import type { InteractionPayload } from '@/features/watch-party/types';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/features/watch-party/api', () => ({
  emitPartyInteraction: vi.fn(),
  onPartyInteraction: vi.fn(() => vi.fn()), // Returns a cleanup function
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockAudioPlay = vi.fn().mockResolvedValue(undefined);
const mockAudioPause = vi.fn();

// Use a class to mock Audio more realistically for JSDOM
class MockAudio {
  src: string;
  play = mockAudioPlay;
  pause = mockAudioPause;
  constructor(src: string) {
    this.src = src;
  }
}

describe('Soundboard', () => {
  beforeAll(() => {
    // @ts-expect-error
    global.Audio = MockAudio;
    // @ts-expect-error
    global.window.Audio = MockAudio;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const flushPromises = async () => {
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(0);
    }
  };

  it('should render all sound buttons', () => {
    render(<Soundboard />);

    expect(screen.getByText('Airhorn')).toBeInTheDocument();
    expect(screen.getByText('Applause')).toBeInTheDocument();
    expect(screen.getByText('Laugh')).toBeInTheDocument();
    expect(screen.getByText('Wow')).toBeInTheDocument();
  });

  it('should play sound and emit interaction when button clicked', async () => {
    render(<Soundboard />);

    const airhornButton = screen.getByText('Airhorn').closest('button');
    if (!airhornButton) throw new Error('Button not found');

    fireEvent.click(airhornButton);

    expect(mockAudioPlay).toHaveBeenCalled();
    expect(emitPartyInteraction).toHaveBeenCalledWith({
      type: 'sound',
      value: 'airhorn',
    });
  });

  it('should play sound when receiving sound interaction', async () => {
    let interactionCallback: (data: InteractionPayload) => void = () => {};
    vi.mocked(onPartyInteraction).mockImplementation(
      (cb: (data: InteractionPayload) => void) => {
        interactionCallback = cb;
        return vi.fn(); // cleanup
      },
    );

    render(<Soundboard />);

    // Simulate incoming sound event
    interactionCallback({
      type: 'sound',
      value: 'applause',
      timestamp: Date.now(),
      userId: 'u1',
      userName: 'User',
    });

    expect(mockAudioPlay).toHaveBeenCalled();
  });

  it('should ignore non-sound interactions', () => {
    let interactionCallback: (data: InteractionPayload) => void = () => {};
    vi.mocked(onPartyInteraction).mockImplementation(
      (cb: (data: InteractionPayload) => void) => {
        interactionCallback = cb;
        return vi.fn(); // cleanup
      },
    );

    render(<Soundboard />);

    // Simulate incoming emoji event
    interactionCallback({
      type: 'emoji',
      value: '👍',
      timestamp: Date.now(),
      userId: 'u1',
      userName: 'User',
    });

    expect(mockAudioPlay).not.toHaveBeenCalled();
  });

  it('should handle audio playback errors gracefully', async () => {
    mockAudioPlay.mockRejectedValueOnce(new Error('Playback failed'));

    render(<Soundboard />);
    const wowButton = screen.getByText('Wow').closest('button');
    if (!wowButton) throw new Error('Button not found');

    fireEvent.click(wowButton);

    // Advance to resolve the click call
    await flushPromises();

    expect(mockAudioPlay).toHaveBeenCalled();
  });
});
