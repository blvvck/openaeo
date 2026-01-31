

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Typography Token System', () => {
  let typographyCss: string;

  beforeAll(() => {
    const typographyPath = join(__dirname, '../styles/tokens/typography.css');
    typographyCss = readFileSync(typographyPath, 'utf-8');
  });

  describe('Font Families', () => {
    it('should define sans font family with Inter', () => {
      expect(typographyCss).toContain("--font-sans: 'Inter'");
    });

    it('should define display font family', () => {
      expect(typographyCss).toContain('--font-display:');
    });

    it('should define mono font family with JetBrains Mono', () => {
      expect(typographyCss).toContain("--font-mono: 'JetBrains Mono'");
    });
  });

  describe('Font Weights', () => {
    it('should define all required weights (400, 500, 600, 700)', () => {
      expect(typographyCss).toContain('--font-weight-regular: 400');
      expect(typographyCss).toContain('--font-weight-medium: 500');
      expect(typographyCss).toContain('--font-weight-semibold: 600');
      expect(typographyCss).toContain('--font-weight-bold: 700');
    });
  });

  describe('Type Scale', () => {
    it('should define display size (48px/3rem)', () => {
      expect(typographyCss).toContain('--text-display-size: 3rem');
    });

    it('should define heading sizes', () => {
      expect(typographyCss).toContain('--text-h1-size: 1.5rem');    // 24px
      expect(typographyCss).toContain('--text-h2-size: 1.5rem');    // 24px
      expect(typographyCss).toContain('--text-h3-size: 1.25rem');   // 20px
      expect(typographyCss).toContain('--text-h4-size: 1.125rem');  // 18px
    });

    it('should define body sizes', () => {
      expect(typographyCss).toContain('--text-body-lg-size: 1rem');     // 16px
      expect(typographyCss).toContain('--text-body-size: 0.875rem');    // 14px
      expect(typographyCss).toContain('--text-body-sm-size: 0.75rem');  // 12px
    });

    it('should define utility sizes', () => {
      expect(typographyCss).toContain('--text-caption-size:');
      expect(typographyCss).toContain('--text-label-size:');
      expect(typographyCss).toContain('--text-micro-size: 0.625rem'); // 10px
    });
  });

  describe('Line Heights', () => {
    it('should define line height tokens', () => {
      expect(typographyCss).toContain('--leading-tight: 1.1');
      expect(typographyCss).toContain('--leading-snug: 1.25');
      expect(typographyCss).toContain('--leading-normal: 1.5');
    });

    it('should have line heights for each text size', () => {
      expect(typographyCss).toContain('--text-display-line-height:');
      expect(typographyCss).toContain('--text-h1-line-height:');
      expect(typographyCss).toContain('--text-body-line-height:');
    });
  });

  describe('Letter Spacing', () => {
    it('should define letter spacing tokens', () => {
      expect(typographyCss).toContain('--tracking-tight: -0.02em');
      expect(typographyCss).toContain('--tracking-normal: 0');
      expect(typographyCss).toContain('--tracking-wide: 0.025em');
    });
  });

  describe('Tabular Numbers', () => {
    it('should define tabular-nums utility', () => {
      expect(typographyCss).toContain('.tabular-nums');
      expect(typographyCss).toContain('font-variant-numeric: tabular-nums');
    });

    it('should use tabular-nums in display text', () => {
      expect(typographyCss).toContain('.text-display');
      // Display should have tabular-nums for metrics
      const displayMatch = typographyCss.match(/\.text-display\s*\{[^}]*\}/);
      expect(displayMatch?.[0]).toContain('tabular-nums');
    });
  });

  describe('Text Utilities', () => {
    it('should define truncation utilities', () => {
      expect(typographyCss).toContain('.truncate');
      expect(typographyCss).toContain('.line-clamp-2');
    });

    it('should define text balance/pretty utilities', () => {
      expect(typographyCss).toContain('.text-balance');
      expect(typographyCss).toContain('text-wrap: balance');
    });

    it('should define word breaking utility', () => {
      expect(typographyCss).toContain('.break-words');
      expect(typographyCss).toContain('overflow-wrap: break-word');
    });
  });

  describe('Responsive Typography', () => {
    it('should include mobile breakpoint adjustments', () => {
      expect(typographyCss).toContain('@media screen and (max-width: 640px)');
    });

    it('should prevent iOS zoom on inputs (minimum 16px)', () => {
      expect(typographyCss).toContain('font-size: 16px');
    });
  });

  describe('Semantic Text Classes', () => {
    it('should define heading classes', () => {
      expect(typographyCss).toContain('.text-h1');
      expect(typographyCss).toContain('.text-h2');
      expect(typographyCss).toContain('.text-h3');
      expect(typographyCss).toContain('.text-h4');
    });

    it('should define body classes', () => {
      expect(typographyCss).toContain('.text-body-lg');
      expect(typographyCss).toContain('.text-body');
      expect(typographyCss).toContain('.text-body-sm');
    });

    it('should define utility text classes', () => {
      expect(typographyCss).toContain('.text-caption');
      expect(typographyCss).toContain('.text-label');
      expect(typographyCss).toContain('.text-micro');
    });
  });
});
