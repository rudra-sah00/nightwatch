/** Centralized analytics event name constants. */

export const AnalyticsEvents = {
  // Auth
  LOGIN_SUCCESS: 'login_success',
  SIGNUP_START: 'signup_start',
  LOGOUT: 'logout',

  // Video
  VIDEO_PLAY: 'video_play',
  LIVESTREAM_WATCH: 'livestream_watch',

  // Watch Party
  PARTY_CREATE: 'party_create',
  PARTY_JOIN: 'party_join',
  PARTY_MEDIA_CONNECT: 'party_media_connect',

  // Clips
  CLIP_RECORD_START: 'clip_record_start',
  CLIP_RECORD_STOP: 'clip_record_stop',
  CLIP_SHARE: 'clip_share',

  // Music
  MUSIC_SEARCH: 'music_search',
  MUSIC_PLAY: 'music_play',
  MUSIC_PLAYLIST_CREATE: 'music_playlist_create',
  MUSIC_ADD_TO_PLAYLIST: 'music_add_to_playlist',

  // Friends & Calls
  FRIEND_REQUEST_SEND: 'friend_request_send',
  FRIEND_REQUEST_ACCEPT: 'friend_request_accept',
  CALL_START: 'call_start',
  CALL_ACCEPT: 'call_accept',
  CALL_END: 'call_end',

  // Watchlist
  WATCHLIST_ADD: 'watchlist_add',
  WATCHLIST_REMOVE: 'watchlist_remove',

  // Profile
  PROFILE_UPDATE: 'profile_update',
  PASSWORD_CHANGE: 'password_change',

  // Search
  SEARCH: 'search',

  // Ask AI
  ASK_AI_START: 'ask_ai_start',

  // Games
  GAME_PLAY: 'game_play',

  // Manga
  MANGA_CHAPTER_READ: 'manga_chapter_read',
  MANGA_FAVORITE_ADD: 'manga_favorite_add',

  // Downloads
  DOWNLOAD_START: 'download_start',

  // Errors (web/desktop crash reporting via Firebase Analytics)
  APP_EXCEPTION: 'app_exception',
  APP_LOG: 'app_log',
} as const;
