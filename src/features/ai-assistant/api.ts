import { apiFetch } from '@/lib/fetch';

/**
 * Stream a response from the AI assistant.
 * Returns a raw Response object to allow for streaming reader access.
 */
export async function streamAiResponse(
  message: string,
  chatHistory: string[],
): Promise<Response> {
  return apiFetch<Response>('/api/ai/stream', {
    method: 'POST',
    rawResponse: true,
    body: JSON.stringify({
      message,
      chatHistory,
    }),
  });
}
