import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicProfile } from '@/features/profile/api';
import { PublicProfileView } from '@/features/profile/components/public-profile-view';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Metadata Generation for Social Previews & SEO
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const result = await getPublicProfile(id).catch(() => null);

  if (!result || !result.profile) {
    return {
      title: 'User Not Found | Rudra Watch',
    };
  }

  const profile = result.profile;
  const displayName = profile.name || profile.username || 'User';

  return {
    title: `${displayName} (@${profile.username}) | Rudra Watch`,
    description: `View ${displayName}'s watch activity and profile on Rudra Watch.`,
    openGraph: {
      title: `${displayName} on Rudra Watch`,
      description: `Watch history and activity profile for ${displayName}.`,
      images: profile.profilePhoto ? [profile.profilePhoto] : [],
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${displayName} | Rudra Watch`,
      description: `Watch history and activity profile for ${displayName}.`,
      images: profile.profilePhoto ? [profile.profilePhoto] : [],
    },
  };
}

/**
 * Public Profile Page (Server Component)
 *
 * Fetches non-sensitive user profile data and watch activity heatmap.
 * Logic is decoupled into PublicProfileView component.
 */
export default async function PublicProfilePage({ params }: Props) {
  const { id } = await params;
  const result = await getPublicProfile(id).catch(() => null);

  if (!result || !result.profile) {
    notFound();
  }

  return <PublicProfileView profile={result.profile} />;
}
