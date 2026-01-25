/**
 * Framer Motion Variants
 *
 * Pre-defined animation variants for consistent motion throughout the app.
 * These mirror the CSS animation tokens for use with Framer Motion components.
 *
 * Usage:
 * import { fadeIn, slideUp } from '@/lib/motion';
 * <motion.div variants={fadeIn} initial="hidden" animate="visible" />
 */

import { Variants, Transition } from 'framer-motion';

// ===== Timing Constants =====
// Match CSS custom properties (--duration-*)
export const DURATION = {
  instant: 0.1,    // 100ms - hover states, micro-interactions
  fast: 0.15,      // 150ms - buttons, toggles
  normal: 0.2,     // 200ms - standard transitions
  slow: 0.3,       // 300ms - modals, dropdowns
  slower: 0.5,     // 500ms - page transitions
  slowest: 0.7,    // 700ms - complex animations
  chart: 1,        // 1000ms - chart enter animations
} as const;

// ===== Stagger Delays =====
// Match CSS custom properties (--stagger-*)
export const STAGGER = {
  fast: 0.03,      // 30ms - quick succession
  normal: 0.05,    // 50ms - standard list items
  slow: 0.1,       // 100ms - dramatic reveals
} as const;

// ===== Easing Curves =====
// Match CSS cubic-bezier curves
export const EASE = {
  default: [0.4, 0, 0.2, 1],
  outExpo: [0.16, 1, 0.3, 1],
  inExpo: [0.7, 0, 0.84, 0],
  inOut: [0.65, 0, 0.35, 1],
  spring: [0.34, 1.56, 0.64, 1],
  emphasized: [0.2, 0, 0, 1],
} as const;

// ===== Spring Configs =====
export const SPRING = {
  // Gentle - for subtle interactions
  gentle: { type: 'spring', stiffness: 120, damping: 14 },
  // Snappy - for quick UI feedback
  snappy: { type: 'spring', stiffness: 300, damping: 30 },
  // Bouncy - for playful elements
  bouncy: { type: 'spring', stiffness: 400, damping: 10 },
  // Stiff - for precise animations
  stiff: { type: 'spring', stiffness: 700, damping: 30 },
} as const;

// ===== Common Transitions =====
export const TRANSITIONS = {
  fast: { duration: DURATION.fast, ease: EASE.outExpo } as Transition,
  normal: { duration: DURATION.normal, ease: EASE.outExpo } as Transition,
  slow: { duration: DURATION.slow, ease: EASE.inOut } as Transition,
  spring: SPRING.snappy as Transition,
} as const;

// ===== Fade Variants =====
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: TRANSITIONS.normal,
  },
  exit: {
    opacity: 0,
    transition: TRANSITIONS.fast,
  },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: TRANSITIONS.normal,
  },
  exit: {
    opacity: 0,
    y: 8,
    transition: TRANSITIONS.fast,
  },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: TRANSITIONS.normal,
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: TRANSITIONS.fast,
  },
};

// ===== Scale Variants =====
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: TRANSITIONS.fast,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: TRANSITIONS.fast,
  },
};

export const scaleInBounce: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: SPRING.bouncy,
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: TRANSITIONS.fast,
  },
};

// ===== Slide Variants =====
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: TRANSITIONS.normal,
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: TRANSITIONS.fast,
  },
};

export const slideDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: TRANSITIONS.normal,
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: TRANSITIONS.fast,
  },
};

export const slideLeft: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: TRANSITIONS.normal,
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: TRANSITIONS.fast,
  },
};

export const slideRight: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: TRANSITIONS.normal,
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: TRANSITIONS.fast,
  },
};

// ===== Stagger Container =====
// For animating lists of items with stagger
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: TRANSITIONS.fast,
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: TRANSITIONS.fast,
  },
};

// ===== Interactive Variants =====
// For hover/tap states on buttons, cards, etc.
export const cardHover: Variants = {
  rest: {
    y: 0,
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    transition: TRANSITIONS.fast,
  },
  hover: {
    y: -2,
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    transition: TRANSITIONS.fast,
  },
  tap: {
    y: 0,
    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    transition: TRANSITIONS.fast,
  },
};

export const buttonPress: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};

// ===== Modal Variants =====
export const modalOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATION.fast },
  },
  exit: {
    opacity: 0,
    transition: { duration: DURATION.fast },
  },
};

export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: DURATION.fast },
  },
};

// ===== Toast Variants =====
export const toastSlideIn: Variants = {
  hidden: { opacity: 0, x: 100 },
  visible: {
    opacity: 1,
    x: 0,
    transition: SPRING.snappy,
  },
  exit: {
    opacity: 0,
    x: 100,
    transition: TRANSITIONS.fast,
  },
};

// ===== Skeleton Shimmer =====
// For skeleton loaders - use with CSS animation
export const shimmer: Variants = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      repeat: Infinity,
      repeatType: 'loop',
      duration: 1.5,
      ease: 'linear',
    },
  },
};

// ===== Reduced Motion Check =====
// Helper to check user preference
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ===== Get Safe Transition =====
// Returns instant transition if user prefers reduced motion
export function getSafeTransition(transition: Transition): Transition {
  if (prefersReducedMotion()) {
    return { duration: 0 };
  }
  return transition;
}
