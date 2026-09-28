import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicProfile } from '@/features/profile/api';
import { UserProfileClient } from '@/features/profile/components/user-profile-client';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://nightwatch.in';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const result = await getPublicProfile(id).catch(() => null);
  const profile = result?.profile;

  if (!profile) {
    return { title: 'Profile Not Found' };
  }

  const handle = profile.username ? `@${profile.username}` : profile.name;
  const description = `${profile.name} on Nightwatch — watch activity, listening history, and shared sessions.`;

  return {
    title: `${profile.name} (${handle})`,
    description,
    openGraph: {
      title: `${profile.name} (${handle})`,
      description,
      url: `${BASE_URL}/user/${id}`,
      type: 'profile',
      images: profile.profilePhoto ? [profile.profilePhoto] : [],
    },
    twitter: {
      card: 'summary',
      title: `${profile.name} (${handle})`,
      description,
      images: profile.profilePhoto ? [profile.profilePhoto] : [],
    },
    alternates: { canonical: `${BASE_URL}/user/${id}` },
  };
}

/**
 * Public profile page.
 *
 * Lives in `(public)`, not `(protected)`, because the URL is meant to be shared and must
 * render for a signed-out visitor. `GET /api/user/public/:id` takes no auth, and
 * `PublicProfileView` already branches on whether a viewer is signed in — the only thing
 * keeping this page behind the login wall was the route group plus the deny-by-default
 * guard in `proxy.ts`.
 *
 * It deliberately does not sit under `(protected)/(main)`. That tree mounts signed-in-only
 * machinery — the call provider, music engine, push registration, the friends sidebar and
 * `HubGate`, which renders a "what do you want to explore?" modal straight over the page.
 * A visitor arriving from a shared link has no session for any of it.
 */
export default async function UserProfilePage({ params }: Props) {
  const { id } = await params;
  const result = await getPublicProfile(id).catch(() => null);

  if (!result?.profile) notFound();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <UserProfileClient
      profile={result.profile}
      todayIso={today.toISOString().split('T')[0]}
    />
  );
}
