// Services API - Central export for all API services
// Import from '@/services/api' for clean access to all API functions

// Authentication service
export {
  type AuthResponse,
  getCurrentUser,
  login,
  logout,
  type User,
} from './auth';
// Core client
export {
  type ApiResponse,
  apiRequest,
  clearStoredUser,
  clearTokens,
  forceLogout,
  forceLogoutWithMessage,
  getAccessToken,
  getApiBase,
  getRefreshToken,
  getStoredUser,
  isAuthenticated,
  setStoredUser,
  setTokens,
} from './client';

// Media service
export {
  getEpisodeData,
  getPosterUrl,
  getSeriesEpisodes,
  getShowDetails,
  getThumbnailUrl,
  getVideoData,
  type SearchResponse,
  type SearchResult,
  search,
  searchImdb,
} from './media';

// Watch Progress / Continue Watching service
export {
  type ContinueWatchingItem,
  type ContinueWatchingResponse,
  formatProgressTime,
  formatRemainingTime,
  getContentProgress,
  getContinueWatching,
  removeFromContinueWatching,
  type UpdateWatchProgressRequest,
  updateWatchProgress,
} from './watchProgress';
