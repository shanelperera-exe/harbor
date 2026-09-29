import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'harbor_theme';

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(STORAGE_KEY);
  return (stored === 'light' || stored === 'dark' || stored === 'system')
    ? stored
    : 'system';
}

function resolveSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export const resolveTheme = (theme: Theme): 'light' | 'dark' => {
  return theme === 'system' ? resolveSystemTheme() : theme;
};

function applyThemeToDom(theme: Theme) {
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  // Tracked as state so that a system appearance change re-renders consumers of
  // resolvedTheme; updating only the DOM class would leave the context value stale.
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(resolveSystemTheme);

  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
    applyThemeToDom(next);
    window.dispatchEvent(new Event('harbor-theme-change'));
  }, []);

  // Apply theme on mount and whenever context theme changes
  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  // React to system-preference changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
      applyThemeToDom('system');
    };
    // Sync once on mount in case the preference changed since initial state.
    handler();
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);

  // Keep context in sync when localStorage is mutated from another tab or component
  useEffect(() => {
    const handler = () => {
      const current = getStoredTheme();
      if (current !== theme) {
        setThemeState(current);
        applyThemeToDom(current);
      }
    };
    window.addEventListener('harbor-theme-change', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('harbor-theme-change', handler);
      window.removeEventListener('storage', handler);
    };
  }, [theme]);

  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
