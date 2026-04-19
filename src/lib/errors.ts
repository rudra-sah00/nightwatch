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

/** Map backend error codes to user-friendly messages. */
const ERROR_MESSAGES: Record<string, string> = {
  SESSION_EXPIRED: 'Session expired. Please login again.',
  USER_EXISTS: 'An account with this email already exists.',
  INVALID_INVITE:
    'Invite link is invalid or expired. Please request a new one.',
  CAPTCHA_REQUIRED: 'Please complete the security verification.',
  CAPTCHA_FAILED: 'Security verification failed. Please try again.',
  OTP_RATE_LIMIT: 'Too many attempts. Please wait and try again.',
  VALIDATION_ERROR: 'Some details are invalid. Please review and try again.',
  CSRF_FAILED: 'Security token expired. Please refresh the page.',
  NOT_FOUND: 'The requested resource was not found.',
  FORBIDDEN: 'You do not have permission to perform this action.',
};

/** Get a user-friendly message for an API error code. */
export function mapErrorCode(code: string | undefined): string | undefined {
  return code ? ERROR_MESSAGES[code] : undefined;
}

/**
 * Centralized API error handler. Extracts a user-friendly message,
 * shows a toast, and returns the message string.
 */
export function handleApiError(
  err: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (isApiError(err)) {
    const mapped = mapErrorCode(err.code);
    const msg = mapped || err.message || fallback;
    toast.error(msg);
    return msg;
  }

  if (err instanceof Error) {
    if (/(failed to fetch|networkerror|timed out)/i.test(err.message)) {
      const msg = 'Network issue. Please check your connection and try again.';
      toast.error(msg);
      return msg;
    }
    toast.error(err.message);
    return err.message;
  }

  toast.error(fallback);
  return fallback;
}
