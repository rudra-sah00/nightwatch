'use client';

import type React from 'react';
import { createContext, use, useEffect, useState } from 'react';

export type ServerId = 's1' | 's2';

interface ServerContextValue {
  activeServer: ServerId;
  serverLabel: string;
  setActiveServer: (server: ServerId) => void;
}

const SERVER_LABELS: Record<ServerId, string> = {
  s1: 'Server 1',
  s2: 'Server 2',
};

const ServerContext = createContext<ServerContextValue>({
  activeServer: 's2',
  serverLabel: 'Server 2',
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

  // Sync when user updates preferredServer in Settings (updateUser changes defaultServer prop)
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
