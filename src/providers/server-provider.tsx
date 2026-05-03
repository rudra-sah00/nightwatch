'use client';

import { useTranslations } from 'next-intl';
import type React from 'react';
import { createContext, use, useEffect, useState } from 'react';

type ServerId = 's1' | 's2';

interface ServerContextValue {
  activeServer: ServerId;
  serverLabel: string;
  setActiveServer: (server: ServerId) => void;
}

const SERVER_LABEL_KEYS: Record<ServerId, string> = {
  s1: 'server.netflix',
  s2: 'server.balanced',
};

const ServerContext = createContext<ServerContextValue>({
  activeServer: 's2',
  serverLabel: '',
  setActiveServer: () => {},
});

interface ServerProviderProps {
  children: React.ReactNode;
  /** Comes from user.preferredServer in auth context. */
  defaultServer?: ServerId;
}

export function ServerProvider({
  children,
  defaultServer,
}: ServerProviderProps) {
  const t = useTranslations('common');
  const [activeServer, setActiveServer] = useState<ServerId>(
    defaultServer ?? 's2',
  );

  // Sync when the user's preferred server changes (e.g. after profile fetch)
  useEffect(() => {
    if (defaultServer) {
      setActiveServer(defaultServer);
    }
  }, [defaultServer]);

  return (
    <ServerContext
      value={{
        activeServer,
        serverLabel: t(SERVER_LABEL_KEYS[activeServer]),
        setActiveServer,
      }}
    >
      {children}
    </ServerContext>
  );
}

export function useServer(): ServerContextValue {
  return use(ServerContext);
}
