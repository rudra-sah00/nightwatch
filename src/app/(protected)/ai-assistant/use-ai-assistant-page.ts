'use client';

import { useState } from 'react';

export function useAiAssistantPage() {
  const [selectedContent, setSelectedContent] = useState<{
    id: string;
    context?: Record<string, unknown>;
    autoPlay?: boolean;
  } | null>(null);

  return { selectedContent, setSelectedContent };
}
