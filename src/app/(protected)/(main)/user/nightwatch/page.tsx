import type { Metadata } from 'next';
import { AIProfileView } from '@/features/explore/components/AIProfileView';

export const metadata: Metadata = {
  title: 'Nightwatch AI — Profile',
  description:
    'The AI companion on Nightwatch. Mentions, recommendations, and real-time web search.',
};

export default function NightwatchAIPage() {
  return <AIProfileView />;
}
