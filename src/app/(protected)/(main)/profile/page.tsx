import type { Metadata } from 'next';
import ProfileClient from './ProfileClient';

export const metadata: Metadata = {
  title: 'Profile | Watch Rudra',
  description: 'Manage your profile and viewing history.',
};

export default async function ProfilePage() {
  return <ProfileClient />;
}
