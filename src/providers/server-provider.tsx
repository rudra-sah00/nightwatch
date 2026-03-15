'use client';

import type React from 'react';
import { createContext, use, useState } from 'react';

export type ServerId = 's1' | 's2' | 's3';

interface ServerContextValue {
  activeServer: ServerId;
  serverLabel: string;
  setActiveServer: (server: ServerId) => void;
}

const SERVER_LABELS: Record<ServerId, string> = {
  s1: 'Server 1',
  s2: 'Server 2',
  s3: 'Server 3',
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

  // Sync defaultServer prop changes during render instead of an effect (rule 5.1).
  // "setState during render" causes React to immediately re-render this component
  // without committing the intermediate state to the DOM — one cycle instead of two.
  const [prevDefaultServer, setPrevDefaultServer] = useState(defaultServer);
  if (prevDefaultServer !== defaultServer && defaultServer) {
    setPrevDefaultServer(defaultServer);
    setActiveServer(defaultServer);
  }

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
