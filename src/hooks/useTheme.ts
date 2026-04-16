import { useEffect, useState, useCallback } from 'react';
import { useSettingsSafe } from '@/contexts/SettingsContext';

type Theme = 'light' | 'dark';
type ThemePref = 'light' | 'dark' | 'system';

function resolve(pref: ThemePref): Theme {
  if (pref === 'system') {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return pref;
}

export function useTheme() {
  const settingsCtx = useSettingsSafe();
  const dbTheme = settingsCtx?.settings.theme as ThemePref | undefined;

  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Sync from DB pref
  useEffect(() => {
    if (!dbTheme) return;
    setThemeState(resolve(dbTheme));
  }, [dbTheme]);

  // Apply to <html> + persist locally
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setThemeState(next);
    if (settingsCtx) {
      settingsCtx.updateSettings({ theme: next }).catch(() => {});
    }
  }, [theme, settingsCtx]);

  return { theme, toggleTheme };
}
