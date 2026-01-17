// Services API - Central export for all API services
// Import from '@/services/api' for clean access to all API functions

// Core client
export {
    apiRequest,
    getAccessToken,
    getRefreshToken,
    setTokens,
    clearTokens,
    getStoredUser,
    setStoredUser,
    isAuthenticated,
    getApiBase,
    type ApiResponse,
} from './client';

// Authentication service
export {
    login,
    logout,
    getCurrentUser,
    type User,
    type AuthResponse,
} from './auth';

// Media service
export {
    search,
    getVideoData,
    getEpisodeData,
    getShowDetails,
    getSeriesEpisodes,
    searchImdb,
    getPosterUrl,
    getThumbnailUrl,
    type SearchResult,
    type SearchResponse,
} from './media';


