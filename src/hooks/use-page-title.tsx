'use client';

import { createContext, useCallback, useContext, useState } from 'react';

interface PageTitleContextType {
  title: string;
  href: string;
  setTitle: (title: string, href?: string) => void;
}

const PageTitleContext = createContext<PageTitleContextType>({
  title: '',
  href: '',
  setTitle: () => {},
});

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitleState] = useState('');
  const [href, setHref] = useState('');
  const setTitle = useCallback((t: string, h?: string) => {
    setTitleState(t);
    setHref(h ?? '');
  }, []);

  return (
    <PageTitleContext.Provider value={{ title, href, setTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
}

export const usePageTitle = () => useContext(PageTitleContext);
