import type { Metadata } from 'next';
import { getPublicClip } from '@/features/clips/api';
import ClipShareClient from './ClipShareClient';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://nightwatch.in';

interface Props {
  params: Promise<{ shareId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareId } = await params;
  const clip = await getPublicClip(shareId).catch(() => null);

  if (!clip) {
    return { title: 'Clip Not Found' };
  }

  return {
    title: clip.title || 'Shared Clip',
    description: `Watch this ${Math.round(clip.duration)}s clip on Nightwatch`,
    openGraph: {
      title: clip.title || 'Shared Clip',
      description: `Watch this ${Math.round(clip.duration)}s clip on Nightwatch`,
      url: `${BASE_URL}/clip/share/${shareId}`,
      type: 'video.other',
      images: clip.thumbnailUrl ? [clip.thumbnailUrl] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: clip.title || 'Shared Clip',
      description: `Watch this ${Math.round(clip.duration)}s clip on Nightwatch`,
      images: clip.thumbnailUrl ? [clip.thumbnailUrl] : [],
    },
    alternates: { canonical: `${BASE_URL}/clip/share/${shareId}` },
  };
}

export default function Page() {
  return <ClipShareClient />;
}
