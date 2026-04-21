import { toast } from 'sonner';
import type { ApiError } from '@/types';

/** Runtime type guard for ApiError — replaces unsafe `err as ApiError` casts. */
export function isApiError(err: unknown): err is ApiError {
  return (
    err instanceof Error &&
    'status' in err &&
    typeof (err as ApiError).status === 'number'
  );
}

/**
 * Map backend error codes to i18n keys (under the `errors` namespace in common.json).
 * Consumers resolve these via `t(key)` from `useTranslations()`.
 */
const ERROR_KEY_MAP: Record<string, string> = {
  SESSION_EXPIRED: 'sessionExpired',
  REQUEST_TIMEOUT: 'requestTimeout',
  USER_EXISTS: 'userExists',
  INVALID_INVITE: 'invalidInvite',
  CAPTCHA_REQUIRED: 'captchaRequired',
  CAPTCHA_FAILED: 'captchaFailed',
  OTP_RATE_LIMIT: 'otpRateLimit',
  VALIDATION_ERROR: 'validationError',
  CSRF_FAILED: 'csrfFailed',
  NOT_FOUND: 'notFound',
  FORBIDDEN: 'forbidden',
};

/** Get an i18n key for an API error code (under the `errors` namespace). */
export function mapErrorCode(code: string | undefined): string | undefined {
  return code ? ERROR_KEY_MAP[code] : undefined;
}

/**
 * Centralized API error handler. Resolves a user-friendly message,
 * shows a toast, and returns the message string.
 *
 * @param err - The caught error
 * @param fallback - Pre-translated fallback message string
 * @param t - Optional translation function scoped to `errors` namespace.
 *            When provided, backend error codes are resolved via i18n keys.
 */
export function handleApiError(
  err: unknown,
  fallback: string,
  t?: (key: string) => string,
): string {
  if (isApiError(err)) {
    const key = mapErrorCode(err.code);
    const msg = (key && t ? t(key) : undefined) || err.message || fallback;
    toast.error(msg);
    return msg;
  }

  if (err instanceof Error) {
    if (/(failed to fetch|networkerror|timed out)/i.test(err.message)) {
      const msg = t ? t('networkError') : fallback;
      toast.error(msg);
      return msg;
    }
    toast.error(err.message);
    return err.message;
  }

  toast.error(fallback);
  return fallback;
}
