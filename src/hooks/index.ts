// Hooks - Central export for all custom hooks
// Organized by feature domain

// Auth hook
export { AuthProvider, useAuth } from './useAuth';

// Series data hook
export { useSeriesData } from './useSeriesData';

// Video hooks (Re-exported from sub-module)
export * from './video';

// Grouped exports for feature-based imports
export * as videoHooks from './video';
