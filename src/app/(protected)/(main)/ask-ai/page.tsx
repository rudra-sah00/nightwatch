import type { Metadata } from 'next';
import { AskAiView } from '@/features/ask-ai/components/AskAiView';
import { TvPageGate } from '@/platforms/smart-tv/components/TvPageGate';
import { TvAskAi } from '@/platforms/smart-tv/pages/TvAskAi';

export const metadata: Metadata = {
  title: 'Ask AI',
};

export default function AskAiPage() {
  return (
    <TvPageGate tvContent={<TvAskAi />}>
      <AskAiView />
    </TvPageGate>
  );
}
