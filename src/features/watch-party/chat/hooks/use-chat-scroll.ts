'use client';

import { useEffect, useRef } from 'react';

/** Scrolls to the bottom of the messages list on initial render. */
export function useChatScroll() {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return { messagesEndRef };
}
