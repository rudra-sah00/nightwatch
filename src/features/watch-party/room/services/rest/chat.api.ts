import { apiFetch } from '@/lib/fetch';
import type { ChatMessage } from '../../types';
import { attempt } from './client';

/**
 * Durable chat history.
 *
 * Live chat travels over RTM. These calls are the backlog: what a member who
 * joined late, reloaded, or scrolled up needs in order to see messages they were
 * not present for.
 *
 * @packageDocumentation
 */

/** Default page size, matching what the chat panel shows without scrolling. */
const DEFAULT_PAGE_SIZE = 40;

/** Persist a chat message so late joiners and reconnects can see it. */
export async function sendPartyMessage(
  roomId: string,
  content: string,
): Promise<{ message?: ChatMessage; error?: string }> {
  return attempt(
    () =>
      apiFetch<{ message: ChatMessage }>(`/api/rooms/${roomId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    (data) => ({ message: data.message }),
  );
}

/**
 * Read chat history.
 *
 * @param options.beforeId - Id of the oldest message already held. The cursor
 *   that "load more" should use: it is stable while new messages append, and
 *   independent of what this client has trimmed from its own list.
 * @param options.before - Offset from the newest message. Kept as a fallback for
 *   a backend that predates `beforeId`, and ignored by one that does not.
 */
export async function getPartyMessages(
  roomId: string,
  options?: { limit?: number; before?: number; beforeId?: string },
): Promise<{ messages?: ChatMessage[]; error?: string }> {
  let url = `/api/rooms/${roomId}/messages?limit=${options?.limit ?? DEFAULT_PAGE_SIZE}`;
  if (options?.before !== undefined) url += `&before=${options.before}`;
  if (options?.beforeId)
    url += `&beforeId=${encodeURIComponent(options.beforeId)}`;

  return attempt(
    () => apiFetch<{ messages: ChatMessage[] }>(url),
    (data) => ({ messages: data.messages }),
  );
}
