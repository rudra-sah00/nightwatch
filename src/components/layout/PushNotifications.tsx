'use client';

import { usePushNotifications } from '@/hooks/use-push-notifications';

/** Headless component that registers push notifications on mount. */
export function PushNotifications() {
  usePushNotifications();
  return null;
}
