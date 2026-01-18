import { track } from '@vercel/analytics/react';

/**
 * Enterprise-grade Analytics Service
 * Centralized event tracking to ensure consistency and type safety.
 */

export type AnalyticsEvent =
  // Video Events
  | 'video_start'
  | 'video_play'
  | 'video_pause'
  | 'video_complete'
  | 'video_buffer_start'
  | 'video_error'
  | 'video_quality_change'
  // Content Events
  | 'view_content'
  | 'search'
  | 'filter_genre'
  // User Events
  | 'login'
  | 'logout'
  | 'profile_update'
  | 'password_change'
  // Feature Usage
  | 'resume_watching'
  | 'remove_continue_watching';

interface BaseEventProps {
  [key: string]: string | number | boolean | null | undefined;
}

export const analytics = {
  /**
   * Track a custom event
   * @param name - The name of the event
   * @param properties - standardized properties for the event
   */
  track: (name: AnalyticsEvent, properties?: BaseEventProps) => {
    try {
      // In development, log to console for debugging
      if (process.env.NODE_ENV === 'development') {
        console.groupCollapsed(`[Analytics] ${name}`);
        console.log(properties);
        console.groupEnd();
      }

      // Track to Vercel Analytics
      track(name, properties as Record<string, string | number>);
    } catch (err) {
      console.warn('Analytics tracking failed:', err);
    }
  },

  // Specialized trackers for common flows

  video: {
    start: (meta: { title: string; src: string; contentId?: string }) => {
      analytics.track('video_start', meta);
    },
    complete: (meta: { title: string; duration: number }) => {
      analytics.track('video_complete', meta);
    },
    error: (meta: { title: string; error: string; src: string }) => {
      analytics.track('video_error', meta);
    },
  },

  content: {
    view: (meta: { id: string; title: string; type: string }) => {
      analytics.track('view_content', meta);
    },
    search: (query: string) => {
      if (!query?.trim()) return;
      analytics.track('search', { query: query.trim() });
    },
  },

  user: {
    login: (method: string = 'credentials') => {
      analytics.track('login', { method });
    },
    logout: () => {
      analytics.track('logout');
    },
    resume: (meta: { id: string; title: string; progress: number }) => {
      analytics.track('resume_watching', meta);
    },
    updateProfile: (updatedFields: string[]) => {
      analytics.track('profile_update', { fields: updatedFields.join(',') });
    },
    changePassword: () => {
      analytics.track('password_change');
    },
  },
};
