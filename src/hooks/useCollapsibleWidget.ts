import { useState, useEffect } from 'react';

export function useCollapsibleWidget(widgetKey: string, defaultOpen = true) {
  const storageKey = `widget_collapsed_${widgetKey}`;

  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored !== null ? JSON.parse(stored) : defaultOpen;
    } catch {
      return defaultOpen;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(isOpen));
    } catch {}
  }, [isOpen, storageKey]);

  const toggle = () => setIsOpen(prev => !prev);

  return { isOpen, toggle };
}
