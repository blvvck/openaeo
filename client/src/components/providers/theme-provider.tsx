

import { createContext, useContext, ReactNode } from 'react';
import { useTheme, UseThemeReturn, Theme } from '@/hooks/use-theme';

// Create context with undefined default
const ThemeContext = createContext<UseThemeReturn | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  /** Default theme if none is stored */
  defaultTheme?: Theme;
  /** Storage key for persistence */
  storageKey?: string;
}

/**
 * Theme provider component
 *
 * Note: This component uses the useTheme hook which handles:
 * - Cookie + localStorage persistence
 * - System preference detection
 * - Tab synchronization
 *
 * For SSR applications, add the FOUC prevention script to your HTML:
 *
 * ```html
 * <script>
 *   (function() {
 *     const theme = document.cookie
 *       .split('; ')
 *       .find(row => row.startsWith('theme='))
 *       ?.split('=')[1] || 'light';
 *
 *     const resolved = theme === 'system'
 *       ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
 *       : theme;
 *
 *     document.documentElement.classList.add(resolved);
 *     document.documentElement.setAttribute('data-theme', resolved);
 *   })();
 * </script>
 * ```
 */
export function ThemeProvider({
  children,
  defaultTheme: _defaultTheme = 'light',
  storageKey: _storageKey = 'theme',
}: ThemeProviderProps) {
  const themeValue = useTheme();

  return (
    <ThemeContext.Provider value={themeValue}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 *
 * Must be used within a ThemeProvider
 */
export function useThemeContext(): UseThemeReturn {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeProvider;
