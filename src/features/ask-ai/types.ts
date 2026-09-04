/** Shared types for the Ask AI voice assistant. */

export type AskAiState = 'idle' | 'listening' | 'speaking';

export type AskAiRole = 'user' | 'assistant';

/** A finalised turn in the conversation. */
export interface AskAiMessage {
  id: string;
  role: AskAiRole;
  content: string;
}

/**
 * Translatable error identifiers.
 *
 * The hook reports codes rather than English sentences so the view can localise
 * them through next-intl like the rest of the app. `serverError` carries an
 * untranslated detail for logging only — it is never shown verbatim.
 */
export type AskAiErrorCode =
  | 'micDenied'
  | 'micUnavailable'
  | 'notConnected'
  | 'startFailed'
  | 'serverError';

export interface AskAiError {
  code: AskAiErrorCode;
  /** Raw upstream text, for diagnostics. Not user-facing. */
  detail?: string;
}
