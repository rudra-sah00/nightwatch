import { useEffect, useState } from 'react';

/** Shared open/close animation state for mobile sidebar overlays. */
export function useSidebarAnimation(open: boolean) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setClosing(false);
    } else if (visible) {
      setClosing(true);
      const t = setTimeout(() => {
        setVisible(false);
        setClosing(false);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open, visible]);

  return { visible, closing };
}
