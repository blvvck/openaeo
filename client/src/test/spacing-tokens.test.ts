

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Spacing Token System', () => {
  let spacingCss: string;

  beforeAll(() => {
    const spacingPath = join(__dirname, '../styles/tokens/spacing.css');
    spacingCss = readFileSync(spacingPath, 'utf-8');
  });

  describe('8pt Grid Scale', () => {
    it('should define base spacing units', () => {
      expect(spacingCss).toContain('--space-0:');
      expect(spacingCss).toContain('--space-1:');  // 4px
      expect(spacingCss).toContain('--space-2:');  // 8px
      expect(spacingCss).toContain('--space-4:');  // 16px
      expect(spacingCss).toContain('--space-8:');  // 32px
    });

    it('should use rem units for scalability', () => {
      expect(spacingCss).toContain('0.25rem');   // 4px
      expect(spacingCss).toContain('0.5rem');    // 8px
      expect(spacingCss).toContain('1rem');      // 16px
      expect(spacingCss).toContain('2rem');      // 32px
    });

    it('should include half-step spacing (4px)', () => {
      expect(spacingCss).toContain('--space-1: 0.25rem');  // 4px
    });

    it('should define large spacing for sections', () => {
      expect(spacingCss).toContain('--space-12:');  // 48px
      expect(spacingCss).toContain('--space-16:');  // 64px
      expect(spacingCss).toContain('--space-20:');  // 80px
      expect(spacingCss).toContain('--space-24:');  // 96px
    });
  });

  describe('Component Spacing', () => {
    it('should define card spacing', () => {
      expect(spacingCss).toContain('--card-padding:');
      expect(spacingCss).toContain('--card-padding-compact:');
      expect(spacingCss).toContain('--card-gap:');
    });

    it('should define button spacing', () => {
      expect(spacingCss).toContain('--button-padding-y:');
      expect(spacingCss).toContain('--button-padding-x:');
      expect(spacingCss).toContain('--button-icon-gap:');
    });

    it('should define input spacing', () => {
      expect(spacingCss).toContain('--input-padding-y:');
      expect(spacingCss).toContain('--input-padding-x:');
    });

    it('should define table spacing', () => {
      expect(spacingCss).toContain('--table-cell-padding-y:');
      expect(spacingCss).toContain('--table-cell-padding-x:');
    });

    it('should define sidebar dimensions', () => {
      expect(spacingCss).toContain('--sidebar-width:');
      expect(spacingCss).toContain('--sidebar-width-collapsed:');
      // Should be 240px (15rem)
      expect(spacingCss).toContain('15rem');
      // Collapsed should be 64px (4rem)
      expect(spacingCss).toContain('4rem');
    });

    it('should define form spacing', () => {
      expect(spacingCss).toContain('--form-label-gap:');
      expect(spacingCss).toContain('--form-field-gap:');
      expect(spacingCss).toContain('--form-section-gap:');
    });

    it('should define section spacing', () => {
      expect(spacingCss).toContain('--section-gap:');
      expect(spacingCss).toContain('--section-padding-y:');
    });

    it('should define page spacing', () => {
      expect(spacingCss).toContain('--page-padding-x:');
      expect(spacingCss).toContain('--page-max-width:');
    });

    it('should define modal spacing', () => {
      expect(spacingCss).toContain('--modal-padding:');
      expect(spacingCss).toContain('--modal-gap:');
    });

    it('should define badge spacing', () => {
      expect(spacingCss).toContain('--badge-padding-y:');
      expect(spacingCss).toContain('--badge-padding-x:');
    });
  });

  describe('Stack and Inline Gaps', () => {
    it('should define stack gap tokens', () => {
      expect(spacingCss).toContain('--stack-gap-xs:');
      expect(spacingCss).toContain('--stack-gap-sm:');
      expect(spacingCss).toContain('--stack-gap-md:');
      expect(spacingCss).toContain('--stack-gap-lg:');
      expect(spacingCss).toContain('--stack-gap-xl:');
    });

    it('should define inline gap tokens', () => {
      expect(spacingCss).toContain('--inline-gap-xs:');
      expect(spacingCss).toContain('--inline-gap-sm:');
      expect(spacingCss).toContain('--inline-gap-md:');
      expect(spacingCss).toContain('--inline-gap-lg:');
    });
  });

  describe('Utility Classes', () => {
    it('should define stack utilities', () => {
      expect(spacingCss).toContain('.stack-xs');
      expect(spacingCss).toContain('.stack-sm');
      expect(spacingCss).toContain('.stack-md');
      expect(spacingCss).toContain('.stack-lg');
      expect(spacingCss).toContain('.stack-xl');
    });

    it('should define inline utilities', () => {
      expect(spacingCss).toContain('.inline-xs');
      expect(spacingCss).toContain('.inline-sm');
      expect(spacingCss).toContain('.inline-md');
      expect(spacingCss).toContain('.inline-lg');
    });

    it('should define section utility', () => {
      expect(spacingCss).toContain('.section');
      expect(spacingCss).toContain('.section-gap');
    });

    it('should define container utility', () => {
      expect(spacingCss).toContain('.container-page');
    });
  });

  describe('Responsive Spacing', () => {
    it('should include responsive breakpoints', () => {
      expect(spacingCss).toContain('@media');
      expect(spacingCss).toContain('768px');   // tablet
      expect(spacingCss).toContain('1024px');  // desktop
    });
  });
});
