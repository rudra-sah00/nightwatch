import type { Metadata } from 'next';
import ProfileClient from './ProfileClient';

export const metadata: Metadata = {
  title: 'Profile | Watch Rudra',
  description: 'Manage your profile and viewing history.',
};

export default async function ProfilePage() {
  // Artificial delay to showcase premium loading animations
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return <ProfileClient />;
}
