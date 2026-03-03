'use client';

import dynamic from 'next/dynamic';

const AiAssistantWidget = dynamic(
  () =>
    import('@/features/ai-assistant/AiAssistantWidget').then(
      (m) => m.AiAssistantWidget,
    ),
  { ssr: false },
);

export function AiAssistantWidgetClient() {
  return <AiAssistantWidget />;
}
