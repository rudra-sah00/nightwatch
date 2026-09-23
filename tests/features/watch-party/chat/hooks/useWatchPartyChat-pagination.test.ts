import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWatchPartyChat } from '@/features/watch-party/chat/hooks/useWatchPartyChat';
import type {
  ChatMessage,
  WatchPartyRoom,
} from '@/features/watch-party/room/types';

vi.mock('@/features/watch-party/room/services/watch-party.api', () => ({
  sendPartyMessage: vi.fn(),
  getPartyMessages: vi.fn(),
}));

const room = { id: 'r1' } as unknown as WatchPartyRoom;

function message(id: string, content = id): ChatMessage {
  return {
    id,
    roomId: 'r1',
    userId: 'u2',
    userName: 'Other',
    content,
    isSystem: false,
    timestamp: 1,
  } as ChatMessage;
}

function setup() {
  return renderHook(() =>
    useWatchPartyChat({
      room,
      userId: 'u1',
      currentUserName: 'Host',
      rtmSendMessage: vi.fn(),
    }),
  );
}

/** Push a live message in over RTM, the way the party actually delivers them. */
function receive(
  result: { current: ReturnType<typeof useWatchPartyChat> },
  id: string,
) {
  act(() => {
    result.current.handleIncomingRtmMessage({
      type: 'CHAT',
      messageId: id,
      content: id,
      userId: 'u2',
      userName: 'Other',
      isSystem: false,
      timestamp: 1,
    });
  });
}

describe('useWatchPartyChat — loading older messages', () => {
  beforeEach(() => vi.clearAllMocks());

  it('pages on the oldest message id, not on how many are on screen', async () => {
    /*
      The backend reads `before` as an offset from the END of an append-only list,
      so a count is not a cursor: anything sent while the request was in flight
      shifts the window and the page comes back overlapping what we already had.
    */
    const { getPartyMessages } = await import(
      '@/features/watch-party/room/services/watch-party.api'
    );
    vi.mocked(getPartyMessages).mockResolvedValue({
      messages: [message('m0')],
    });

    const { result } = setup();
    receive(result, 'm1');
    receive(result, 'm2');

    await act(async () => {
      await result.current.loadMoreMessages();
    });

    expect(getPartyMessages).toHaveBeenCalledWith(
      'r1',
      expect.objectContaining({ beforeId: 'm1' }),
    );
  });

  it('never uses an unconfirmed local message as the cursor', async () => {
    // A `temp-` id exists on no server, so asking for messages before it would
    // find nothing at all.
    const { getPartyMessages, sendPartyMessage } = await import(
      '@/features/watch-party/room/services/watch-party.api'
    );
    vi.mocked(sendPartyMessage).mockResolvedValue({ error: 'nope' });
    vi.mocked(getPartyMessages).mockResolvedValue({ messages: [] });

    const { result } = setup();
    await act(async () => {
      await result.current.sendMessage('mine');
    });
    await act(async () => {
      await result.current.loadMoreMessages();
    });

    expect(getPartyMessages).toHaveBeenCalledWith(
      'r1',
      expect.objectContaining({ beforeId: undefined }),
    );
  });

  it('prepends history and keeps it when a new message arrives', async () => {
    /*
      The cap trims the FRONT of the list, which is right for the live tail and
      wrong for scrollback: loading 40 older messages and then receiving one line
      used to run the trim and throw all 40 away, so history vanished the moment
      anybody spoke.
    */
    const { getPartyMessages } = await import(
      '@/features/watch-party/room/services/watch-party.api'
    );
    const history = Array.from({ length: 40 }, (_, i) => message(`h${i}`));
    vi.mocked(getPartyMessages).mockResolvedValue({ messages: history });

    const { result } = setup();
    receive(result, 'live1');

    await act(async () => {
      await result.current.loadMoreMessages();
    });
    expect(result.current.messages).toHaveLength(41);
    expect(result.current.messages[0].id).toBe('h0');

    receive(result, 'live2');
    expect(result.current.messages).toHaveLength(42);
    expect(result.current.messages[0].id).toBe('h0');
  });

  it('stops asking once a page brings nothing new', async () => {
    const { getPartyMessages } = await import(
      '@/features/watch-party/room/services/watch-party.api'
    );
    const { result } = setup();
    receive(result, 'm1');

    // A page made entirely of messages we hold means we are at the start of the
    // backlog, whatever its length claimed.
    vi.mocked(getPartyMessages).mockResolvedValue({
      messages: [message('m1')],
    });
    await act(async () => {
      await result.current.loadMoreMessages();
    });

    expect(result.current.hasMoreMessages).toBe(false);
    vi.mocked(getPartyMessages).mockClear();
    await act(async () => {
      await result.current.loadMoreMessages();
    });
    expect(getPartyMessages).not.toHaveBeenCalled();
  });

  it('stops asking on an empty page', async () => {
    const { getPartyMessages } = await import(
      '@/features/watch-party/room/services/watch-party.api'
    );
    vi.mocked(getPartyMessages).mockResolvedValue({ messages: [] });
    const { result } = setup();

    await act(async () => {
      await result.current.loadMoreMessages();
    });
    expect(result.current.hasMoreMessages).toBe(false);
  });

  it('does not run two pages at once', async () => {
    const { getPartyMessages } = await import(
      '@/features/watch-party/room/services/watch-party.api'
    );
    let resolve: ((v: { messages: ChatMessage[] }) => void) | undefined;
    vi.mocked(getPartyMessages).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );

    const { result } = setup();
    await act(async () => {
      void result.current.loadMoreMessages();
      void result.current.loadMoreMessages();
    });
    expect(getPartyMessages).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolve?.({ messages: [] });
    });
  });
});
