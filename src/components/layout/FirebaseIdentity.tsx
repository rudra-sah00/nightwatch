'use client';

import { useFirebaseIdentity } from '@/hooks/use-firebase-identity';

/** Headless component that syncs user identity to Firebase Crashlytics & Analytics on native. */
export function FirebaseIdentity() {
  useFirebaseIdentity();
  return null;
}
