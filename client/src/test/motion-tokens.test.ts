

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Motion Token System', () => {
  let motionCss: string;

  beforeAll(() => {
    const motionPath = join(__dirname, '../styles/tokens/motion.css');
    motionCss = readFileSync(motionPath, 'utf-8');
  });

  describe('Duration Scale', () => {
    it('should define all duration tokens', () => {
      expect(motionCss).toContain('--duration-instant:');
      expect(motionCss).toContain('--duration-fast:');
      expect(motionCss).toContain('--duration-normal:');
      expect(motionCss).toContain('--duration-slow:');
      expect(motionCss).toContain('--duration-slower:');
    });

    it('should define chart animation duration', () => {
      expect(motionCss).toContain('--duration-chart:');
      expect(motionCss).toContain('1000ms');
    });

    it('should use ms units for durations', () => {
      expect(motionCss).toMatch(/--duration-instant:\s*100ms/);
      expect(motionCss).toMatch(/--duration-fast:\s*150ms/);
      expect(motionCss).toMatch(/--duration-normal:\s*200ms/);
    });
  });

  describe('Easing Functions', () => {
    it('should define all easing tokens', () => {
      expect(motionCss).toContain('--ease-default:');
      expect(motionCss).toContain('--ease-in:');
      expect(motionCss).toContain('--ease-out:');
      expect(motionCss).toContain('--ease-out-expo:');
      expect(motionCss).toContain('--ease-in-out:');
      expect(motionCss).toContain('--ease-spring:');
    });

    it('should use cubic-bezier for easings', () => {
      expect(motionCss).toContain('cubic-bezier');
    });

    it('should define expo easing correctly', () => {
      // outExpo: cubic-bezier(0.16, 1, 0.3, 1)
      expect(motionCss).toMatch(/--ease-out-expo:\s*cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\)/);
    });

    it('should define spring easing correctly', () => {
      // spring: cubic-bezier(0.34, 1.56, 0.64, 1)
      expect(motionCss).toMatch(/--ease-spring:\s*cubic-bezier\(0\.34,\s*1\.56,\s*0\.64,\s*1\)/);
    });
  });

  describe('Stagger Delays', () => {
    it('should define stagger delay tokens', () => {
      expect(motionCss).toContain('--stagger-fast:');
      expect(motionCss).toContain('--stagger-normal:');
      expect(motionCss).toContain('--stagger-slow:');
    });
  });

  describe('Transform Values', () => {
    it('should define translate distances', () => {
      expect(motionCss).toContain('--translate-sm:');
      expect(motionCss).toContain('--translate-md:');
      expect(motionCss).toContain('--translate-lg:');
    });

    it('should define scale values', () => {
      expect(motionCss).toContain('--scale-pressed:');
      expect(motionCss).toContain('--scale-hover:');
      expect(motionCss).toContain('--scale-enter:');
    });
  });

  describe('Transition Utilities', () => {
    it('should define base transition utilities', () => {
      expect(motionCss).toContain('.transition-all');
      expect(motionCss).toContain('.transition-colors');
      expect(motionCss).toContain('.transition-opacity');
      expect(motionCss).toContain('.transition-transform');
    });

    it('should define duration modifier utilities', () => {
      expect(motionCss).toContain('.duration-instant');
      expect(motionCss).toContain('.duration-fast');
      expect(motionCss).toContain('.duration-normal');
      expect(motionCss).toContain('.duration-slow');
    });

    it('should define easing modifier utilities', () => {
      expect(motionCss).toContain('.ease-default');
      expect(motionCss).toContain('.ease-out-expo');
      expect(motionCss).toContain('.ease-spring');
    });
  });

  describe('Animation Utilities', () => {
    it('should define fade animations', () => {
      expect(motionCss).toContain('.animate-fade-in');
      expect(motionCss).toContain('.animate-fade-in-up');
      expect(motionCss).toContain('.animate-fade-in-down');
    });

    it('should define scale animation', () => {
      expect(motionCss).toContain('.animate-scale-in');
    });

    it('should define slide animations', () => {
      expect(motionCss).toContain('.animate-slide-up');
      expect(motionCss).toContain('.animate-slide-down');
    });

    it('should define utility animations', () => {
      expect(motionCss).toContain('.animate-pulse');
      expect(motionCss).toContain('.animate-spin');
      expect(motionCss).toContain('.animate-bounce');
    });

    it('should define shimmer animation for skeletons', () => {
      expect(motionCss).toContain('.animate-shimmer');
    });
  });

  describe('Keyframe Animations', () => {
    it('should define all keyframes', () => {
      expect(motionCss).toContain('@keyframes fadeIn');
      expect(motionCss).toContain('@keyframes fadeInUp');
      expect(motionCss).toContain('@keyframes scaleIn');
      expect(motionCss).toContain('@keyframes slideUp');
      expect(motionCss).toContain('@keyframes pulse');
      expect(motionCss).toContain('@keyframes spin');
      expect(motionCss).toContain('@keyframes shimmer');
    });
  });

  describe('Reduced Motion Support', () => {
    it('should include prefers-reduced-motion media query', () => {
      expect(motionCss).toContain('@media (prefers-reduced-motion: reduce)');
    });

    it('should disable animations for reduced motion', () => {
      expect(motionCss).toContain('animation-duration: 0.01ms !important');
    });

    it('should disable transitions for reduced motion', () => {
      expect(motionCss).toContain('transition-duration: 0.01ms !important');
    });

    it('should keep shimmer background visible with reduced motion', () => {
      // Shimmer should still show a solid background
      expect(motionCss).toContain('.animate-shimmer');
      expect(motionCss).toMatch(/\.animate-shimmer[^}]*background:/);
    });
  });
});

describe('Framer Motion Config (motion.ts)', () => {
  it('should export DURATION constants matching CSS', async () => {
    const { DURATION } = await import('../lib/motion');
    expect(DURATION.instant).toBe(0.1);   // 100ms
    expect(DURATION.fast).toBe(0.15);     // 150ms
    expect(DURATION.normal).toBe(0.2);    // 200ms
    expect(DURATION.slow).toBe(0.3);      // 300ms
    expect(DURATION.chart).toBe(1);       // 1000ms
  });

  it('should export EASE curves matching CSS', async () => {
    const { EASE } = await import('../lib/motion');
    expect(EASE.outExpo).toEqual([0.16, 1, 0.3, 1]);
    expect(EASE.spring).toEqual([0.34, 1.56, 0.64, 1]);
    expect(EASE.inOut).toEqual([0.65, 0, 0.35, 1]);
  });

  it('should export STAGGER delays matching CSS', async () => {
    const { STAGGER } = await import('../lib/motion');
    expect(STAGGER.fast).toBe(0.03);      // 30ms
    expect(STAGGER.normal).toBe(0.05);    // 50ms
    expect(STAGGER.slow).toBe(0.1);       // 100ms
  });

  it('should export SPRING configs', async () => {
    const { SPRING } = await import('../lib/motion');
    expect(SPRING.gentle).toBeDefined();
    expect(SPRING.snappy).toBeDefined();
    expect(SPRING.bouncy).toBeDefined();
    expect(SPRING.stiff).toBeDefined();
  });

  it('should export prefersReducedMotion helper', async () => {
    const { prefersReducedMotion } = await import('../lib/motion');
    expect(typeof prefersReducedMotion).toBe('function');
  });

  it('should export getSafeTransition helper', async () => {
    const { getSafeTransition } = await import('../lib/motion');
    expect(typeof getSafeTransition).toBe('function');
  });
});
