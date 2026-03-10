// API Endpoints
export const API_ROUTES = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REGISTER: '/api/auth/register',
    REFRESH: '/api/auth/refresh',
  },
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  USER: 'user',
  SESSION_ID: 'sessionId',
} as const;

// Socket.IO Events
export const WS_EVENTS = {
  FORCE_LOGOUT: 'force_logout',
  STREAM_REVOKED: 'stream:revoked',
  /** Emitted by the client to signal intentional stream teardown so the
   *  backend can immediately remove the Redis session rather than waiting
   *  for its TTL or the socket-disconnect handler. */
  STREAM_STOP: 'stream:stop',
  WATCH_RECORD_TIME: 'watch:record_time',
  WATCH_UPDATE_PROGRESS: 'watch:update_progress',
  WATCH_GET_CONTINUE: 'watch:get_continue_watching',
} as const;
