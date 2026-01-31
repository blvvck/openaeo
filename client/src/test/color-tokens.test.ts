

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Color Token System', () => {
  let colorsCss: string;

  beforeAll(() => {
    const colorsPath = join(__dirname, '../styles/tokens/colors.css');
    colorsCss = readFileSync(colorsPath, 'utf-8');
  });

  describe('Light Mode Tokens', () => {
    it('should define all background tokens', () => {
      expect(colorsCss).toContain('--background:');
      expect(colorsCss).toContain('--background-elevated:');
      expect(colorsCss).toContain('--background-muted:');
      expect(colorsCss).toContain('--background-subtle:');
    });

    it('should define all text tokens', () => {
      expect(colorsCss).toContain('--text-primary:');
      expect(colorsCss).toContain('--text-secondary:');
      expect(colorsCss).toContain('--text-muted:');
      expect(colorsCss).toContain('--text-disabled:');
    });

    it('should define all border tokens', () => {
      expect(colorsCss).toContain('--border:');
      expect(colorsCss).toContain('--border-muted:');
      expect(colorsCss).toContain('--border-focus:');
    });

    it('should define interactive tokens', () => {
      expect(colorsCss).toContain('--ring:');
      expect(colorsCss).toContain('--ring-offset:');
    });
  });

  describe('Dark Mode Tokens', () => {
    it('should define dark mode selector', () => {
      expect(colorsCss).toMatch(/\.dark|data-theme="dark"/);
    });

    it('should have different background values for dark mode', () => {
      // Dark mode uses #0A0A0A for background
      expect(colorsCss).toContain('#0A0A0A');
      // Light mode uses #FFFFFF for background
      expect(colorsCss).toContain('#FFFFFF');
    });
  });

  describe('Semantic Colors', () => {
    it('should define status colors', () => {
      expect(colorsCss).toContain('--success:');
      expect(colorsCss).toContain('--warning:');
      expect(colorsCss).toContain('--error:');
      expect(colorsCss).toContain('--info:');
    });

    it('should define muted variants', () => {
      expect(colorsCss).toContain('--success-muted:');
      expect(colorsCss).toContain('--warning-muted:');
      expect(colorsCss).toContain('--error-muted:');
      expect(colorsCss).toContain('--info-muted:');
    });

    it('should define trend indicators', () => {
      expect(colorsCss).toContain('--trend-up:');
      expect(colorsCss).toContain('--trend-down:');
      expect(colorsCss).toContain('--trend-neutral:');
    });

    it('should use correct colors for trends', () => {
      // Trend up should be green (#22C55E)
      expect(colorsCss).toMatch(/--trend-up:\s*#22C55E/i);
      // Trend down should be red (#EF4444)
      expect(colorsCss).toMatch(/--trend-down:\s*#EF4444/i);
    });
  });

  describe('Chart Palette', () => {
    it('should define 8 chart colors', () => {
      for (let i = 1; i <= 8; i++) {
        expect(colorsCss).toContain(`--chart-${i}:`);
      }
    });

    it('should define muted variants for all chart colors', () => {
      for (let i = 1; i <= 8; i++) {
        expect(colorsCss).toContain(`--chart-${i}-muted:`);
      }
    });

    it('should use colorblind-safe palette', () => {
      // These are the specified colorblind-safe colors
      const chartColors = [
        '#22C55E', // Green
        '#3B82F6', // Blue
        '#F97316', // Orange
        '#A855F7', // Purple
        '#EC4899', // Pink
        '#14B8A6', // Teal
        '#F59E0B', // Amber
        '#6366F1', // Indigo
      ];
      chartColors.forEach((color) => {
        expect(colorsCss.toUpperCase()).toContain(color);
      });
    });
  });

  describe('Brand Color Scales', () => {
    it('should define full primary color scale (50-950)', () => {
      const scales = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
      scales.forEach((scale) => {
        expect(colorsCss).toContain(`--primary-${scale}:`);
      });
    });

    it('should define full gray color scale (50-950)', () => {
      const scales = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
      scales.forEach((scale) => {
        expect(colorsCss).toContain(`--gray-${scale}:`);
      });
    });
  });

  describe('shadcn/ui Compatibility', () => {
    it('should define required shadcn semantic tokens', () => {
      expect(colorsCss).toContain('--foreground:');
      expect(colorsCss).toContain('--card:');
      expect(colorsCss).toContain('--card-foreground:');
      expect(colorsCss).toContain('--popover:');
      expect(colorsCss).toContain('--popover-foreground:');
      expect(colorsCss).toContain('--primary:');
      expect(colorsCss).toContain('--primary-foreground:');
      expect(colorsCss).toContain('--secondary:');
      expect(colorsCss).toContain('--secondary-foreground:');
      expect(colorsCss).toContain('--muted:');
      expect(colorsCss).toContain('--muted-foreground:');
      expect(colorsCss).toContain('--destructive:');
      expect(colorsCss).toContain('--destructive-foreground:');
      expect(colorsCss).toContain('--input:');
      expect(colorsCss).toContain('--radius:');
    });

    it('should define sidebar tokens', () => {
      expect(colorsCss).toContain('--sidebar-background:');
      expect(colorsCss).toContain('--sidebar-foreground:');
      expect(colorsCss).toContain('--sidebar-primary:');
      expect(colorsCss).toContain('--sidebar-border:');
    });
  });
});
