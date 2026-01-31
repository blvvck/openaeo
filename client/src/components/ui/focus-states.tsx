

import * as React from 'react';
import { cn } from '@/lib/utils';
import { DURATION, EASE, prefersReducedMotion } from '@/lib/motion';

// ===== Constants =====
export const FOCUS_RING_VARIANTS = {
  default: 'ring-2 ring-ring ring-offset-2 ring-offset-background',
  inset: 'ring-2 ring-ring ring-inset',
  offset: 'ring-2 ring-ring ring-offset-4 ring-offset-background',
  primary: 'ring-2 ring-primary ring-offset-2 ring-offset-background',
  secondary: 'ring-2 ring-secondary ring-offset-2 ring-offset-background',
  accent: 'ring-2 ring-accent ring-offset-2 ring-offset-background',
  destructive: 'ring-2 ring-destructive ring-offset-2 ring-offset-background',
  success: 'ring-2 ring-success ring-offset-2 ring-offset-background',
} as const;

export type FocusRingVariant = keyof typeof FOCUS_RING_VARIANTS;

// ===== FocusRing Component =====
export interface FocusRingProps extends React.HTMLAttributes<HTMLElement> {
  /** Focus ring variant */
  variant?: FocusRingVariant;
  /** Whether focus ring is visible */
  visible?: boolean;
  /** Children to wrap */
  children: React.ReactNode;
  /** Render as different element */
  as?: React.ElementType;
}

/**
 * FocusRing wraps an element and applies focus ring styles
 * when the element (or its children) receive focus-visible.
 */
export const FocusRing = React.forwardRef<HTMLDivElement, FocusRingProps>(
  ({ variant = 'default', visible, children, className, as: Component = 'div', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          'focus-within:outline-none',
          visible && FOCUS_RING_VARIANTS[variant],
          !visible && `focus-visible:${FOCUS_RING_VARIANTS[variant].split(' ').join(' focus-visible:')}`,
          'transition-shadow duration-200',
          'motion-reduce:transition-none',
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
FocusRing.displayName = 'FocusRing';

// ===== Focus Ring Utility Classes =====
/**
 * Get focus ring classes for a given variant
 * Use with cn() to apply focus styles to any element
 */
export function getFocusRingClasses(
  variant: FocusRingVariant = 'default',
  options: { focusVisible?: boolean; alwaysShow?: boolean } = {}
): string {
  const { focusVisible = true, alwaysShow = false } = options;
  const baseClasses = FOCUS_RING_VARIANTS[variant];

  if (alwaysShow) {
    return baseClasses;
  }

  if (focusVisible) {
    return baseClasses
      .split(' ')
      .map((cls) => `focus-visible:${cls}`)
      .join(' ');
  }

  return baseClasses
    .split(' ')
    .map((cls) => `focus:${cls}`)
    .join(' ');
}

// ===== FocusTrap Component =====
export interface FocusTrapProps {
  /** Whether the focus trap is active */
  active?: boolean;
  /** Return focus to trigger element when deactivated */
  returnFocus?: boolean;
  /** Children to trap focus within */
  children: React.ReactNode;
  /** Initial focus element selector or ref */
  initialFocus?: string | React.RefObject<HTMLElement>;
  /** Callback when user tries to escape the trap */
  onEscape?: () => void;
  /** Additional class name */
  className?: string;
}

/**
 * FocusTrap contains focus within a container for modals/dialogs.
 * Handles Tab, Shift+Tab, and Escape key.
 */
export const FocusTrap = React.forwardRef<HTMLDivElement, FocusTrapProps>(
  ({ active = true, returnFocus = true, children, initialFocus, onEscape, className }, ref) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLElement | null>(null);

    // Combine refs
    React.useImperativeHandle(ref, () => containerRef.current!);

    // Store trigger element on mount
    React.useEffect(() => {
      if (active && returnFocus) {
        triggerRef.current = document.activeElement as HTMLElement;
      }
    }, [active, returnFocus]);

    // Return focus on unmount/deactivate
    React.useEffect(() => {
      return () => {
        if (returnFocus && triggerRef.current?.focus) {
          // Small delay to ensure DOM is ready
          requestAnimationFrame(() => {
            triggerRef.current?.focus();
          });
        }
      };
    }, [returnFocus]);

    // Set initial focus
    React.useEffect(() => {
      if (!active || !containerRef.current) return;

      const setInitialFocus = () => {
        // Guard against unmounted component
        if (!containerRef.current) return;

        if (initialFocus) {
          if (typeof initialFocus === 'string') {
            const element = containerRef.current?.querySelector<HTMLElement>(initialFocus);
            element?.focus();
          } else if (initialFocus.current) {
            initialFocus.current.focus();
          }
        } else {
          // Focus first focusable element
          const focusable = getFocusableElements(containerRef.current);
          if (focusable.length > 0) {
            focusable[0].focus();
          }
        }
      };

      // Delay to ensure content is rendered
      const frameId = requestAnimationFrame(setInitialFocus);
      return () => cancelAnimationFrame(frameId);
    }, [active, initialFocus]);

    // Handle keyboard navigation
    React.useEffect(() => {
      if (!active || !containerRef.current) return;

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onEscape?.();
          return;
        }

        if (event.key !== 'Tab') return;

        // Guard against unmounted component
        if (!containerRef.current) return;

        const focusable = getFocusableElements(containerRef.current);
        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (event.shiftKey) {
          // Shift+Tab: if on first element, go to last
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: if on last element, go to first
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [active, onEscape]);

    return (
      <div
        ref={containerRef}
        className={className}
        role="dialog"
        aria-modal={active}
        tabIndex={-1}
      >
        {children}
      </div>
    );
  }
);
FocusTrap.displayName = 'FocusTrap';

// ===== SkipToContent Component =====
export interface SkipToContentProps {
  /** ID of the main content element to skip to */
  targetId: string;
  /** Custom text (default: "Skip to content") */
  children?: React.ReactNode;
  /** Additional class name */
  className?: string;
}

/**
 * SkipToContent provides a skip link for keyboard users.
 * Visible only on focus, positioned at top of page.
 */
export const SkipToContent: React.FC<SkipToContentProps> = ({
  targetId,
  children = 'Skip to content',
  className,
}) => {
  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      const target = document.getElementById(targetId);
      if (target) {
        target.focus();
        target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      }
    },
    [targetId]
  );

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={cn(
        // Position fixed at top, hidden until focused
        'fixed left-4 top-4 z-[9999]',
        'px-4 py-2 rounded-md',
        // Hidden by default
        '-translate-y-full opacity-0',
        // Visible on focus
        'focus:translate-y-0 focus:opacity-100',
        // Styling
        'bg-primary text-primary-foreground',
        'font-medium text-sm',
        // Focus ring
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        // Transition
        'transition-all duration-200',
        'motion-reduce:transition-none',
        className
      )}
    >
      {children}
    </a>
  );
};
SkipToContent.displayName = 'SkipToContent';

// ===== FocusIndicator Component =====
export interface FocusIndicatorProps {
  /** Whether to show the indicator */
  show: boolean;
  /** Indicator variant */
  variant?: FocusRingVariant;
  /** Position relative to target */
  position?: 'around' | 'inside';
  /** Animation enabled */
  animated?: boolean;
  /** Children (the element to indicate) */
  children: React.ReactNode;
  /** Additional class name */
  className?: string;
}

/**
 * FocusIndicator shows a visual indicator around focused content.
 * Useful for custom focus states on complex components.
 */
export const FocusIndicator = React.forwardRef<HTMLDivElement, FocusIndicatorProps>(
  ({ show, variant = 'default', position = 'around', animated = true, children, className }, ref) => {
    const [isAnimating, setIsAnimating] = React.useState(false);

    React.useEffect(() => {
      if (show && animated && !prefersReducedMotion()) {
        setIsAnimating(true);
        const timeout = setTimeout(() => setIsAnimating(false), 300);
        return () => clearTimeout(timeout);
      }
    }, [show, animated]);

    const ringClasses = position === 'inside'
      ? FOCUS_RING_VARIANTS.inset
      : FOCUS_RING_VARIANTS[variant];

    return (
      <div
        ref={ref}
        className={cn(
          'relative',
          show && ringClasses,
          show && animated && isAnimating && 'animate-pulse',
          'transition-shadow duration-200',
          'motion-reduce:transition-none motion-reduce:animate-none',
          className
        )}
      >
        {children}
      </div>
    );
  }
);
FocusIndicator.displayName = 'FocusIndicator';

// ===== useFocusReturn Hook =====
/**
 * Hook to return focus to the trigger element when a modal/dropdown closes.
 */
export function useFocusReturn(active: boolean) {
  const triggerRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (active) {
      triggerRef.current = document.activeElement as HTMLElement;
    }
  }, [active]);

  const returnFocus = React.useCallback(() => {
    if (triggerRef.current?.focus) {
      requestAnimationFrame(() => {
        triggerRef.current?.focus();
      });
    }
  }, []);

  return { returnFocus, triggerRef };
}

// ===== useFocusWithin Hook =====
/**
 * Hook to track whether focus is within a container.
 */
export function useFocusWithin<T extends HTMLElement = HTMLElement>() {
  const ref = React.useRef<T>(null);
  const [isFocusWithin, setIsFocusWithin] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleFocusIn = () => setIsFocusWithin(true);
    const handleFocusOut = (event: FocusEvent) => {
      // Check if new focus target is still within the element
      if (!element.contains(event.relatedTarget as Node)) {
        setIsFocusWithin(false);
      }
    };

    element.addEventListener('focusin', handleFocusIn);
    element.addEventListener('focusout', handleFocusOut);

    return () => {
      element.removeEventListener('focusin', handleFocusIn);
      element.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  return { ref, isFocusWithin };
}

// ===== useKeyboardNavigation Hook =====
export interface KeyboardNavigationOptions {
  /** Elements to navigate between (selector or refs) */
  orientation?: 'horizontal' | 'vertical' | 'both';
  /** Enable loop navigation */
  loop?: boolean;
  /** Callback when selection changes */
  onSelect?: (index: number) => void;
  /** Initial selected index */
  initialIndex?: number;
}

/**
 * Hook for arrow key navigation within a list of items.
 */
export function useKeyboardNavigation<T extends HTMLElement = HTMLElement>(
  options: KeyboardNavigationOptions = {}
) {
  const { orientation = 'vertical', loop = true, onSelect, initialIndex = 0 } = options;
  const containerRef = React.useRef<T>(null);
  const [activeIndex, setActiveIndex] = React.useState(initialIndex);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) return;

      const currentIndex = focusable.findIndex((el) => el === document.activeElement);
      let nextIndex = currentIndex;

      const isVerticalNav = orientation === 'vertical' || orientation === 'both';
      const isHorizontalNav = orientation === 'horizontal' || orientation === 'both';

      switch (event.key) {
        case 'ArrowDown':
          if (isVerticalNav) {
            event.preventDefault();
            nextIndex = currentIndex + 1;
          }
          break;
        case 'ArrowUp':
          if (isVerticalNav) {
            event.preventDefault();
            nextIndex = currentIndex - 1;
          }
          break;
        case 'ArrowRight':
          if (isHorizontalNav) {
            event.preventDefault();
            nextIndex = currentIndex + 1;
          }
          break;
        case 'ArrowLeft':
          if (isHorizontalNav) {
            event.preventDefault();
            nextIndex = currentIndex - 1;
          }
          break;
        case 'Home':
          event.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          event.preventDefault();
          nextIndex = focusable.length - 1;
          break;
        case 'Enter':
        case ' ':
          if (currentIndex >= 0) {
            onSelect?.(currentIndex);
          }
          return;
        default:
          return;
      }

      // Handle loop or clamp
      if (loop) {
        if (nextIndex < 0) nextIndex = focusable.length - 1;
        if (nextIndex >= focusable.length) nextIndex = 0;
      } else {
        nextIndex = Math.max(0, Math.min(nextIndex, focusable.length - 1));
      }

      if (nextIndex !== currentIndex && focusable[nextIndex]) {
        focusable[nextIndex].focus();
        setActiveIndex(nextIndex);
      }
    },
    [orientation, loop, onSelect]
  );

  return {
    containerRef,
    activeIndex,
    setActiveIndex,
    handleKeyDown,
    getItemProps: (index: number) => ({
      tabIndex: index === activeIndex ? 0 : -1,
      'data-active': index === activeIndex ? '' : undefined,
    }),
  };
}

// ===== Utility Functions =====

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelector = [
    'a[href]:not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"])',
    'audio[controls]:not([tabindex="-1"])',
    'video[controls]:not([tabindex="-1"])',
    '[contenteditable]:not([contenteditable="false"]):not([tabindex="-1"])',
    'details>summary:first-of-type:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(
    container.querySelectorAll<HTMLElement>(focusableSelector)
  ).filter((el) => {
    // Exclude hidden elements
    return !el.hidden && el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden';
  });
}

/**
 * Focus the first focusable element in a container
 */
export function focusFirstElement(container: HTMLElement): boolean {
  const focusable = getFocusableElements(container);
  if (focusable.length > 0) {
    focusable[0].focus();
    return true;
  }
  return false;
}

/**
 * Focus the last focusable element in a container
 */
export function focusLastElement(container: HTMLElement): boolean {
  const focusable = getFocusableElements(container);
  if (focusable.length > 0) {
    focusable[focusable.length - 1].focus();
    return true;
  }
  return false;
}

// ===== CSS Utility Classes =====
/**
 * Pre-defined focus state CSS classes for use with Tailwind
 */
export const focusClasses = {
  // Standard focus ring (focus-visible)
  ring: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  // Inset focus ring
  ringInset: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
  // Offset focus ring
  ringOffset: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background',
  // Primary color focus ring
  ringPrimary: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  // Focus within (for containers)
  within: 'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
  // No focus ring (use sparingly)
  none: 'focus:outline-none focus-visible:outline-none',
  // Transition for smooth focus
  transition: 'transition-shadow duration-200 motion-reduce:transition-none',
} as const;

/**
 * Get combined focus classes with transition
 */
export function getFocusClasses(variant: keyof typeof focusClasses = 'ring'): string {
  return cn(focusClasses[variant], focusClasses.transition);
}

// ===== Re-exports from motion.ts =====
export { prefersReducedMotion } from '@/lib/motion';
