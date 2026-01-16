// Hooks - Central export for all custom hooks
// Organized by feature domain

// Auth hook
export { useAuth, AuthProvider } from './useAuth';

// Video hooks (Re-exported from sub-module)
export * from './video';

// Room hooks (Re-exported from sub-module)
export * from './room';

// Grouped exports for feature-based imports
export * as videoHooks from './video';
export * as roomHooks from './room';
