import { apiFetch } from '@/lib/fetch';

/**
 * Shared shape for every watch-party REST call.
 *
 * None of these functions throw. A watch party is a live session with several
 * people in it, and the correct response to a failed `kick` or a failed
 * `syncPartyState` is a toast, not an unmounted player — so failures come back as
 * data and each caller decides what it means.
 */
export type ApiResult<T> = T & { error?: string };

/** Turn an unknown thrown value into the `error` string these results carry. */
export function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown error';
}

/**
 * Run a request and fold a rejection into `{ error }`.
 *
 * Replaces the `try { … } catch (err) { return { error: err instanceof Error ? … } }`
 * block that was copy-pasted into all fourteen REST helpers.
 *
 * @param request - The call to make.
 * @param onSuccess - Maps the response body to the result shape. Omit when the
 *   body is the result.
 */
export async function attempt<TResponse, TResult>(
  request: () => Promise<TResponse>,
  onSuccess: (data: TResponse) => TResult,
): Promise<ApiResult<TResult>> {
  try {
    return (await request().then(onSuccess)) as ApiResult<TResult>;
  } catch (err) {
    return { error: toErrorMessage(err) } as ApiResult<TResult>;
  }
}

/**
 * A POST whose only interesting outcome is whether it worked.
 *
 * @param path - API path.
 * @param body - JSON body, omitted when undefined.
 */
export async function postForSuccess(
  path: string,
  body?: unknown,
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiFetch(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: toErrorMessage(err) };
  }
}
