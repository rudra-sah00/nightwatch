import type { Metadata } from 'next';
import LandingPage from './LandingClient';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://nightwatch.in';

export const metadata: Metadata = {
  title: 'Nightwatch — Watch Together, Stream, and Connect',
  description:
    'Your personal streaming companion — synchronized playback, watch parties, live streaming, music, and voice calls with friends.',
  openGraph: {
    title: 'Nightwatch — Watch Together, Stream, and Connect',
    description:
      'Synchronized playback, watch parties, live streaming, music, and voice calls with friends.',
    url: BASE_URL,
  },
  alternates: { canonical: BASE_URL },
};

export default function Page() {
  return <LandingPage />;
}
