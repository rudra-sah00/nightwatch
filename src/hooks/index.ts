// Hooks - Central export for all custom hooks
// Organized by feature domain

// Auth hook
export { AuthProvider, useAuth } from './useAuth';

// Series data hook
export { useSeriesData } from './useSeriesData';

// Watch activity hook (daily tracking for profile)
export { useWatchActivity } from './useWatchActivity';

// Watch progress hook (continue watching)
export { useWatchProgress } from './useWatchProgress';

// Video hooks (Re-exported from sub-module)
export * from './video';

// Grouped exports for feature-based imports
export * as videoHooks from './video';
