

import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface UseThemeReturn {
  /** Current theme setting ('light' | 'dark' | 'system') */
  theme: Theme;
  /** Actual applied theme after resolving system preference */
  resolvedTheme: ResolvedTheme;
  /** Set theme to a specific value */
  setTheme: (theme: Theme) => void;
  /** Toggle between light and dark (ignores system) */
  toggleTheme: () => void;
  /** Current system preference */
  systemTheme: ResolvedTheme;
}

const STORAGE_KEY = 'theme';
const COOKIE_MAX_AGE = 31536000; // 1 year in seconds

/**
 * Get the system color scheme preference
 */
function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Resolve the actual theme from preference
 */
function resolveTheme(theme: Theme, systemTheme: ResolvedTheme): ResolvedTheme {
  return theme === 'system' ? systemTheme : theme;
}

/**
 * Get stored theme from localStorage or cookie
 */
function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light';

  // Try localStorage first
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored && ['light', 'dark', 'system'].includes(stored)) {
    return stored;
  }

  // Fall back to cookie
  const cookieMatch = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${STORAGE_KEY}=`));
  const cookieValue = cookieMatch?.split('=')[1] as Theme | undefined;
  if (cookieValue && ['light', 'dark', 'system'].includes(cookieValue)) {
    return cookieValue;
  }

  // Default to light (primary theme)
  return 'light';
}

/**
 * Apply theme to document
 */
function applyTheme(resolvedTheme: ResolvedTheme): void {
  const root = document.documentElement;

  // Add transition class for smooth theme change
  root.style.setProperty('--theme-transition', '200ms');

  // Apply theme class and data attribute
  root.classList.remove('light', 'dark');
  root.classList.add(resolvedTheme);
  root.setAttribute('data-theme', resolvedTheme);

  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      'content',
      resolvedTheme === 'dark' ? '#0A0A0A' : '#FFFFFF'
    );
  }

  // Remove transition after it completes to avoid affecting other animations
  setTimeout(() => {
    root.style.removeProperty('--theme-transition');
  }, 200);
}

/**
 * Persist theme to localStorage and cookie
 */
function persistTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;

  // Save to localStorage
  localStorage.setItem(STORAGE_KEY, theme);

  // Save to cookie for SSR
  document.cookie = `${STORAGE_KEY}=${theme}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Strict`;
}

/**
 * Hook for managing theme state
 */
export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    getSystemTheme()
  );

  // Resolved theme based on current settings
  const resolvedTheme = resolveTheme(theme, systemTheme);

  // Set theme and persist
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    persistTheme(newTheme);
    const newResolved = resolveTheme(newTheme, getSystemTheme());
    applyTheme(newResolved);
  }, []);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    const newTheme: Theme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  // Apply theme on mount and when it changes
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Tab synchronization via storage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const newTheme = e.newValue as Theme;
        if (['light', 'dark', 'system'].includes(newTheme)) {
          setThemeState(newTheme);
          applyTheme(resolveTheme(newTheme, getSystemTheme()));
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    systemTheme,
  };
}

export default useTheme;
