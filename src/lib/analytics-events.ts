/** Centralized analytics event name constants. */

export const AnalyticsEvents = {
  // Auth
  LOGIN_SUCCESS: 'login_success',
  SIGNUP_START: 'signup_start',
  SIGNUP_COMPLETE: 'signup_complete',
  LOGOUT: 'logout',

  // Video
  VIDEO_PLAY: 'video_play',
  VIDEO_COMPLETE: 'video_complete',
  VIDEO_BUFFER_START: 'video_buffer_start',
  VIDEO_BUFFER_END: 'video_buffer_end',
  VIDEO_ERROR: 'video_error',
  VIDEO_QUALITY_SWITCH: 'video_quality_switch',
  LIVESTREAM_WATCH: 'livestream_watch',

  // Watch Party
  PARTY_CREATE: 'party_create',
  PARTY_JOIN: 'party_join',
  PARTY_LEAVE: 'party_leave',
  PARTY_MEDIA_CONNECT: 'party_media_connect',
  PARTY_CHAT_SEND: 'party_chat_send',
  PARTY_EMOJI_REACTION: 'party_emoji_reaction',
  PARTY_SOUNDBOARD: 'party_soundboard',
  PARTY_KICK: 'party_kick',
  PARTY_INVITE_COPY: 'party_invite_copy',
  PARTY_SYNC_PLAY: 'party_sync_play',
  PARTY_SYNC_PAUSE: 'party_sync_pause',
  PARTY_SYNC_SEEK: 'party_sync_seek',

  // Clips
  CLIP_RECORD_START: 'clip_record_start',
  CLIP_RECORD_STOP: 'clip_record_stop',
  CLIP_SHARE: 'clip_share',

  // Music
  MUSIC_SEARCH: 'music_search',
  MUSIC_PLAY: 'music_play',
  MUSIC_TRACK_COMPLETE: 'music_track_complete',
  MUSIC_PLAYLIST_CREATE: 'music_playlist_create',
  MUSIC_ADD_TO_PLAYLIST: 'music_add_to_playlist',
  MUSIC_EQUALIZER_CHANGE: 'music_equalizer_change',
  MUSIC_CROSSFADE_CHANGE: 'music_crossfade_change',
  MUSIC_DEVICE_TRANSFER: 'music_device_transfer',

  // Music Discover
  DISCOVER_SWIPE_LIKE: 'discover_swipe_like',
  DISCOVER_SWIPE_DISLIKE: 'discover_swipe_dislike',
  DISCOVER_UNDO: 'discover_undo',
  DISCOVER_ADD_TO_PLAYLIST: 'discover_add_to_playlist',
  DISCOVER_PREVIEW_PLAY: 'discover_preview_play',
  DISCOVER_SESSION_START: 'discover_session_start',

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
  DOWNLOAD_COMPLETE: 'download_complete',

  // Notifications & App
  NOTIFICATION_OPEN: 'notification_open',
  SHARE_CONTENT: 'share_content',

  // Errors (web/desktop crash reporting via Firebase Analytics)
  APP_EXCEPTION: 'app_exception',
  APP_LOG: 'app_log',
} as const;
