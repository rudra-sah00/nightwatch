import type { Metadata } from 'next';
import { AskAiView } from '@/features/ask-ai/components/AskAiView';

export const metadata: Metadata = {
  title: 'Ask AI | Nightwatch',
};

export default function AskAiPage() {
  return <AskAiView />;
}
