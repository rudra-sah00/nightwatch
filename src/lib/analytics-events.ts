/** Centralized analytics event name constants. */

export const AnalyticsEvents = {
  // Auth
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failure',
  SIGNUP_START: 'signup_start',
  SIGNUP_COMPLETE: 'signup_complete',
  SIGNUP_FAILURE: 'signup_failure',
  LOGOUT: 'logout',
  PASSWORD_RESET_REQUEST: 'password_reset_request',

  // Video
  VIDEO_PLAY: 'video_play',
  VIDEO_PAUSE: 'video_pause',
  VIDEO_SEEK: 'video_seek',
  VIDEO_SKIP: 'video_skip',
  VIDEO_COMPLETE: 'video_complete',
  VIDEO_BUFFER_START: 'video_buffer_start',
  VIDEO_BUFFER_END: 'video_buffer_end',
  VIDEO_ERROR: 'video_error',
  VIDEO_QUALITY_SWITCH: 'video_quality_switch',
  VIDEO_FULLSCREEN: 'video_fullscreen',
  VIDEO_SUBTITLE_CHANGE: 'video_subtitle_change',
  VIDEO_SPEED_CHANGE: 'video_speed_change',
  VIDEO_EPISODE_CHANGE: 'video_episode_change',
  VIDEO_NEXT_EPISODE_AUTO: 'video_next_episode_auto',
  VIDEO_NEXT_EPISODE_CANCEL: 'video_next_episode_cancel',
  LIVESTREAM_WATCH: 'livestream_watch',
  LIVESTREAM_WATCH_PARTY: 'livestream_watch_party',
  LIVESTREAM_SPORT_FILTER: 'livestream_sport_filter',
  LIVESTREAM_ERROR: 'livestream_error',

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
  PARTY_APPROVE_MEMBER: 'party_approve_member',
  PARTY_REJECT_MEMBER: 'party_reject_member',

  // Clips
  CLIP_RECORD_START: 'clip_record_start',
  CLIP_RECORD_STOP: 'clip_record_stop',
  CLIP_RECORD_FAIL: 'clip_record_fail',
  CLIP_SHARE: 'clip_share',
  CLIP_PLAY: 'clip_play',
  CLIP_DELETE: 'clip_delete',
  CLIP_RENAME: 'clip_rename',
  CLIP_TOGGLE_PUBLIC: 'clip_toggle_public',

  // Music
  MUSIC_SEARCH: 'music_search',
  MUSIC_PLAY: 'music_play',
  MUSIC_PAUSE: 'music_pause',
  MUSIC_NEXT: 'music_next',
  MUSIC_PREVIOUS: 'music_previous',
  MUSIC_TRACK_COMPLETE: 'music_track_complete',
  MUSIC_SHUFFLE_TOGGLE: 'music_shuffle_toggle',
  MUSIC_REPEAT_CHANGE: 'music_repeat_change',
  MUSIC_QUEUE_ADD: 'music_queue_add',
  MUSIC_PLAYLIST_CREATE: 'music_playlist_create',
  MUSIC_PLAYLIST_DELETE: 'music_playlist_delete',
  MUSIC_ADD_TO_PLAYLIST: 'music_add_to_playlist',
  MUSIC_REMOVE_FROM_PLAYLIST: 'music_remove_from_playlist',
  MUSIC_EQUALIZER_CHANGE: 'music_equalizer_change',
  MUSIC_CROSSFADE_CHANGE: 'music_crossfade_change',
  MUSIC_DEVICE_TRANSFER: 'music_device_transfer',
  MUSIC_SLEEP_TIMER_SET: 'music_sleep_timer_set',
  MUSIC_SLEEP_TIMER_CLEAR: 'music_sleep_timer_clear',

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
  FRIEND_REQUEST_REJECT: 'friend_request_reject',
  FRIEND_REMOVE: 'friend_remove',
  FRIEND_BLOCK: 'friend_block',
  CALL_START: 'call_start',
  CALL_ACCEPT: 'call_accept',
  CALL_DECLINE: 'call_decline',
  CALL_END: 'call_end',

  // Watchlist
  WATCHLIST_ADD: 'watchlist_add',
  WATCHLIST_REMOVE: 'watchlist_remove',

  // Profile
  PROFILE_UPDATE: 'profile_update',
  PASSWORD_CHANGE: 'password_change',

  // Search
  SEARCH: 'search',
  SEARCH_RESULT_CLICK: 'search_result_click',
  SEARCH_NO_RESULTS: 'search_no_results',

  // Ask AI
  ASK_AI_START: 'ask_ai_start',
  ASK_AI_END: 'ask_ai_end',
  ASK_AI_ERROR: 'ask_ai_error',

  // Games
  GAME_PLAY: 'game_play',
  GAME_END: 'game_end',

  // Manga
  MANGA_CHAPTER_READ: 'manga_chapter_read',
  MANGA_FAVORITE_ADD: 'manga_favorite_add',
  MANGA_FAVORITE_REMOVE: 'manga_favorite_remove',

  // Downloads
  DOWNLOAD_START: 'download_start',
  DOWNLOAD_COMPLETE: 'download_complete',
  DOWNLOAD_CANCEL: 'download_cancel',

  // Notifications & App
  NOTIFICATION_OPEN: 'notification_open',
  SHARE_CONTENT: 'share_content',

  // Errors (web/desktop crash reporting via Firebase Analytics)
  APP_EXCEPTION: 'app_exception',
  APP_LOG: 'app_log',
} as const;
