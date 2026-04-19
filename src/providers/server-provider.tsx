'use client';

import type React from 'react';
import { createContext, use, useEffect, useState } from 'react';

type ServerId = 's1' | 's2' | 's3';

interface ServerContextValue {
  activeServer: ServerId;
  serverLabel: string;
  setActiveServer: (server: ServerId) => void;
}

const SERVER_LABELS: Record<ServerId, string> = {
  s1: 'Netflix',
  s2: 'Balanced',
  s3: 'High Quality Stream',
};

const ServerContext = createContext<ServerContextValue>({
  activeServer: 's2',
  serverLabel: 'Balanced',
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
        serverLabel: SERVER_LABELS[activeServer],
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
