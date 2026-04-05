'use client';

import { useEffect, useState } from 'react';

function getCurrentTime() {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function useLiveClock() {
  const [time, setTime] = useState(getCurrentTime);

  useEffect(() => {
    const id = setInterval(() => {
      setTime(getCurrentTime());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return { time };
}
