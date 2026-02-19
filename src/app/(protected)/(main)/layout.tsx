'use client';

import { AiAssistantWidget } from '@/features/ai-assistant/AiAssistantWidget';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <AiAssistantWidget />
    </>
  );
}
