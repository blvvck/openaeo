

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Border and Shadow Token System', () => {
  let bordersCss: string;

  beforeAll(() => {
    const bordersPath = join(__dirname, '../styles/tokens/borders.css');
    bordersCss = readFileSync(bordersPath, 'utf-8');
  });

  describe('Border Radius Scale', () => {
    it('should define all radius tokens', () => {
      expect(bordersCss).toContain('--radius-none:');
      expect(bordersCss).toContain('--radius-sm:');     // 4px
      expect(bordersCss).toContain('--radius-md:');     // 8px
      expect(bordersCss).toContain('--radius-lg:');     // 12px
      expect(bordersCss).toContain('--radius-xl:');     // 16px
      expect(bordersCss).toContain('--radius-full:');   // 9999px
    });

    it('should define shadcn-compatible radius alias', () => {
      expect(bordersCss).toContain('--radius:');
    });

    it('should use rem units for radius', () => {
      expect(bordersCss).toContain('0.25rem');   // sm (4px)
      expect(bordersCss).toContain('0.5rem');    // md (8px)
      expect(bordersCss).toContain('0.75rem');   // lg (12px)
    });

    it('should define 9999px for full radius (pills)', () => {
      expect(bordersCss).toContain('9999px');
    });
  });

  describe('Border Widths', () => {
    it('should define border width tokens', () => {
      expect(bordersCss).toContain('--border-width-none:');
      expect(bordersCss).toContain('--border-width-thin:');
      expect(bordersCss).toContain('--border-width-default:');
      expect(bordersCss).toContain('--border-width-thick:');
    });
  });

  describe('Shadow Scale (Light Mode)', () => {
    it('should define all shadow levels', () => {
      expect(bordersCss).toContain('--shadow-xs:');
      expect(bordersCss).toContain('--shadow-sm:');
      expect(bordersCss).toContain('--shadow-md:');
      expect(bordersCss).toContain('--shadow-lg:');
      expect(bordersCss).toContain('--shadow-xl:');
      expect(bordersCss).toContain('--shadow-2xl:');
    });

    it('should define inner shadow', () => {
      expect(bordersCss).toContain('--shadow-inner:');
      expect(bordersCss).toContain('inset');
    });

    it('should define focus ring shadows', () => {
      expect(bordersCss).toContain('--shadow-ring:');
      expect(bordersCss).toContain('--shadow-ring-error:');
      expect(bordersCss).toContain('--shadow-ring-success:');
    });

    it('should define no shadow option', () => {
      expect(bordersCss).toContain('--shadow-none: none');
    });
  });

  describe('Component-to-Radius Mapping', () => {
    it('should map buttons to md radius (8px)', () => {
      expect(bordersCss).toContain('--button-radius:');
      expect(bordersCss).toMatch(/--button-radius:\s*var\(--radius-md\)/);
    });

    it('should map inputs to md radius (8px)', () => {
      expect(bordersCss).toContain('--input-radius:');
      expect(bordersCss).toMatch(/--input-radius:\s*var\(--radius-md\)/);
    });

    it('should map cards to lg radius (12px)', () => {
      expect(bordersCss).toContain('--card-radius:');
      expect(bordersCss).toMatch(/--card-radius:\s*var\(--radius-lg\)/);
    });

    it('should map modals to xl radius (16px)', () => {
      expect(bordersCss).toContain('--modal-radius:');
      expect(bordersCss).toMatch(/--modal-radius:\s*var\(--radius-xl\)/);
    });

    it('should map badges to full radius (pill)', () => {
      expect(bordersCss).toContain('--badge-radius:');
      expect(bordersCss).toMatch(/--badge-radius:\s*var\(--radius-full\)/);
    });

    it('should map sidebar to none (edge-to-edge)', () => {
      expect(bordersCss).toContain('--sidebar-radius:');
      expect(bordersCss).toMatch(/--sidebar-radius:\s*var\(--radius-none\)/);
    });
  });

  describe('Component-to-Shadow Mapping', () => {
    it('should define component shadows', () => {
      expect(bordersCss).toContain('--card-shadow:');
      expect(bordersCss).toContain('--dropdown-shadow:');
      expect(bordersCss).toContain('--modal-shadow:');
      expect(bordersCss).toContain('--tooltip-shadow:');
    });

    it('should define input focus shadow', () => {
      expect(bordersCss).toContain('--input-focus-shadow:');
      expect(bordersCss).toMatch(/--input-focus-shadow:\s*var\(--shadow-ring\)/);
    });
  });

  describe('Dark Mode Shadow Strategy', () => {
    it('should include dark mode selector', () => {
      expect(bordersCss).toContain('.dark');
    });

    it('should define reduced shadows for dark mode', () => {
      // Dark mode shadows should be defined
      const darkSection = bordersCss.match(/\.dark\s*\{[^}]+\}/)?.[0];
      expect(darkSection).toBeTruthy();
      expect(darkSection).toContain('--shadow-sm:');
    });

    it('should remove card shadow in dark mode', () => {
      // Card shadow should be none in dark mode
      const darkSection = bordersCss.match(/\.dark\s*\{[^}]+\}/)?.[0];
      expect(darkSection).toContain('--card-shadow: var(--shadow-none)');
    });
  });

  describe('Utility Classes', () => {
    it('should define radius utilities', () => {
      expect(bordersCss).toContain('.rounded-none');
      expect(bordersCss).toContain('.rounded-sm');
      expect(bordersCss).toContain('.rounded-md');
      expect(bordersCss).toContain('.rounded-lg');
      expect(bordersCss).toContain('.rounded-xl');
      expect(bordersCss).toContain('.rounded-full');
    });

    it('should define component-specific radius utilities', () => {
      expect(bordersCss).toContain('.rounded-card');
      expect(bordersCss).toContain('.rounded-button');
      expect(bordersCss).toContain('.rounded-modal');
    });

    it('should define shadow utilities', () => {
      expect(bordersCss).toContain('.shadow-none');
      expect(bordersCss).toContain('.shadow-sm');
      expect(bordersCss).toContain('.shadow-md');
      expect(bordersCss).toContain('.shadow-lg');
      expect(bordersCss).toContain('.shadow-xl');
    });

    it('should define focus ring utilities', () => {
      expect(bordersCss).toContain('.ring-focus');
      expect(bordersCss).toContain('.ring-error');
      expect(bordersCss).toContain('.ring-success');
    });

    it('should define nested radius helpers', () => {
      expect(bordersCss).toContain('.inner-rounded-lg');
      expect(bordersCss).toContain('.rounded-b-card');
    });
  });
});
