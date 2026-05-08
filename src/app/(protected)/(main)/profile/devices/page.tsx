'use client';

import { ActiveDevices } from '@/features/profile/components/active-devices';
import { ProfileBackButton } from '@/features/profile/components/profile-back-button';

export default function DevicesPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 animate-in fade-in duration-200 w-full">
      <ProfileBackButton label="Profile" />
      <ActiveDevices />
    </main>
  );
}
