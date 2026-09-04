/**
 * Resolves where to send a user after a successful login.
 *
 * `proxy.ts` appends `?from={path}` when it bounces a signed-out visitor, so a
 * deep link survives the login detour. That value arrives from the URL and is
 * therefore untrusted: echoing it into a navigation unchecked would be an open
 * redirect, letting a crafted link send users to an attacker's origin after
 * they authenticate.
 *
 * Only same-origin, path-absolute values are accepted. Anything else falls back
 * to {@link DEFAULT_POST_LOGIN_PATH}.
 */

export const DEFAULT_POST_LOGIN_PATH = '/home';

/**
 * Destinations that would immediately bounce the user back into the login flow.
 *
 * Matched precisely rather than by bare prefix: `/continue-watching` is a real
 * page and must stay a valid destination even though it shares a prefix with
 * `/continue`.
 */
function isLoginFlowPath(from: string): boolean {
  if (from.startsWith('/auth/')) return true;
  const [path] = from.split(/[?#]/);
  return path === '/continue';
}

export function resolvePostLoginPath(from: string | null | undefined): string {
  if (!from) return DEFAULT_POST_LOGIN_PATH;

  // Must be a path, not a full/protocol-relative URL. `//evil.com` and
  // `https://evil.com` are both rejected here, as is `\\evil.com`, which some
  // browsers normalise to a protocol-relative URL.
  if (!from.startsWith('/')) return DEFAULT_POST_LOGIN_PATH;
  if (from.startsWith('//') || from.startsWith('/\\')) {
    return DEFAULT_POST_LOGIN_PATH;
  }

  // Reject control characters and anything that could smuggle a scheme past
  // the checks above once the browser normalises the string.
  // biome-ignore lint/suspicious/noControlCharactersInRegex: rejecting these is the point
  if (/[\u0000-\u001f\u007f]/.test(from)) return DEFAULT_POST_LOGIN_PATH;
  if (from.includes('\\')) return DEFAULT_POST_LOGIN_PATH;

  if (isLoginFlowPath(from)) return DEFAULT_POST_LOGIN_PATH;

  return from;
}
