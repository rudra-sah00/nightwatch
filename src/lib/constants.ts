// API Endpoints
export const API_ROUTES = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
  },
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  USER: 'user',
  SESSION_ID: 'sessionId',
} as const;

// WebSocket Events
export const WS_EVENTS = {
  FORCE_LOGOUT: 'force_logout',
  WATCH_RECORD_TIME: 'watch:record_time',
  WATCH_UPDATE_PROGRESS: 'watch:update_progress',
  WATCH_GET_CONTINUE: 'watch:get_continue_watching',
} as const;
