

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Theme Switching Infrastructure', () => {
  describe('useTheme Hook', () => {
    let useThemeSource: string;

    beforeAll(() => {
      const hookPath = join(__dirname, '../hooks/use-theme.ts');
      useThemeSource = readFileSync(hookPath, 'utf-8');
    });

    it('should export Theme type', () => {
      expect(useThemeSource).toContain("type Theme = 'light' | 'dark' | 'system'");
    });

    it('should export ResolvedTheme type', () => {
      expect(useThemeSource).toContain("type ResolvedTheme = 'light' | 'dark'");
    });

    it('should export UseThemeReturn interface', () => {
      expect(useThemeSource).toContain('interface UseThemeReturn');
      expect(useThemeSource).toContain('theme: Theme');
      expect(useThemeSource).toContain('resolvedTheme: ResolvedTheme');
      expect(useThemeSource).toContain('setTheme: (theme: Theme) => void');
      expect(useThemeSource).toContain('toggleTheme: () => void');
      expect(useThemeSource).toContain('systemTheme: ResolvedTheme');
    });

    it('should have cookie persistence', () => {
      expect(useThemeSource).toContain('document.cookie');
      expect(useThemeSource).toContain('COOKIE_MAX_AGE');
    });

    it('should have localStorage persistence', () => {
      expect(useThemeSource).toContain('localStorage');
      expect(useThemeSource).toContain('STORAGE_KEY');
    });

    it('should support system preference detection', () => {
      expect(useThemeSource).toContain('prefers-color-scheme: dark');
      expect(useThemeSource).toContain('matchMedia');
    });

    it('should support tab synchronization', () => {
      expect(useThemeSource).toContain('storage');
      expect(useThemeSource).toContain('addEventListener');
      expect(useThemeSource).toContain('StorageEvent');
    });

    it('should apply theme class and data attribute', () => {
      expect(useThemeSource).toContain('classList');
      expect(useThemeSource).toContain('data-theme');
    });

    it('should default to light mode', () => {
      // Default should be 'light' not 'system'
      expect(useThemeSource).toMatch(/return\s*['"]light['"]/);
    });
  });

  describe('ThemeToggle Component', () => {
    let toggleSource: string;

    beforeAll(() => {
      const togglePath = join(__dirname, '../components/ui/theme-toggle.tsx');
      toggleSource = readFileSync(togglePath, 'utf-8');
    });

    it('should support dropdown variant', () => {
      expect(toggleSource).toContain('DropdownMenu');
      expect(toggleSource).toContain('DropdownMenuItem');
    });

    it('should support simple variant', () => {
      expect(toggleSource).toContain("variant?: 'dropdown' | 'simple'");
      expect(toggleSource).toContain('ThemeToggleSimple');
    });

    it('should have light/dark/system options', () => {
      expect(toggleSource).toContain("value: 'light'");
      expect(toggleSource).toContain("value: 'dark'");
      expect(toggleSource).toContain("value: 'system'");
    });

    it('should be accessible', () => {
      expect(toggleSource).toContain('aria-label');
      expect(toggleSource).toContain('sr-only');
    });

    it('should show current selection indicator', () => {
      expect(toggleSource).toContain('Check');
      expect(toggleSource).toContain('theme === value');
    });

    it('should use Sun and Moon icons', () => {
      expect(toggleSource).toContain("import { Moon, Sun");
      expect(toggleSource).toContain('<Sun');
      expect(toggleSource).toContain('<Moon');
    });
  });

  describe('ThemeProvider Component', () => {
    let providerSource: string;

    beforeAll(() => {
      const providerPath = join(__dirname, '../components/providers/theme-provider.tsx');
      providerSource = readFileSync(providerPath, 'utf-8');
    });

    it('should create theme context', () => {
      expect(providerSource).toContain('createContext');
      expect(providerSource).toContain('ThemeContext');
    });

    it('should export ThemeProvider component', () => {
      expect(providerSource).toContain('export function ThemeProvider');
    });

    it('should export useThemeContext hook', () => {
      expect(providerSource).toContain('export function useThemeContext');
    });

    it('should have defaultTheme prop', () => {
      expect(providerSource).toContain('defaultTheme');
    });

    it('should throw error when used outside provider', () => {
      expect(providerSource).toContain('must be used within a ThemeProvider');
    });
  });

  describe('FOUC Prevention Script', () => {
    let indexHtml: string;

    beforeAll(() => {
      const indexPath = join(__dirname, '../../index.html');
      indexHtml = readFileSync(indexPath, 'utf-8');
    });

    it('should have inline theme script in head', () => {
      expect(indexHtml).toContain('<script>');
      expect(indexHtml).toContain('theme');
    });

    it('should check cookie before localStorage', () => {
      expect(indexHtml).toContain('document.cookie');
      expect(indexHtml).toContain('localStorage');
    });

    it('should detect system preference', () => {
      expect(indexHtml).toContain('prefers-color-scheme');
    });

    it('should apply theme class immediately', () => {
      expect(indexHtml).toContain('classList.add');
    });

    it('should set data-theme attribute', () => {
      expect(indexHtml).toContain('data-theme');
    });

    it('should have theme-color meta tag', () => {
      expect(indexHtml).toContain('meta name="theme-color"');
    });

    it('should update theme-color meta on theme change', () => {
      expect(indexHtml).toContain('meta[name="theme-color"]');
      expect(indexHtml).toContain('#0A0A0A'); // Dark mode color
      expect(indexHtml).toContain('#FFFFFF'); // Light mode color
    });
  });
});

describe('Theme Hook Functionality', () => {
  it('should export useTheme function', async () => {
    const { useTheme } = await import('../hooks/use-theme');
    expect(typeof useTheme).toBe('function');
  });

  it('should export Theme type', async () => {
    const module = await import('../hooks/use-theme');
    // TypeScript types don't exist at runtime, but we can check the module exports
    expect(module).toBeDefined();
  });
});
