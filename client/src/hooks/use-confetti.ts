import { useCallback, useRef } from "react";
import confetti from "canvas-confetti";

const SESSION_KEY = "confetti_shown";

interface ConfettiOptions {
  /** Number of particles (default: 100) */
  particleCount?: number;
  /** Spread angle in degrees (default: 70) */
  spread?: number;
  /** Origin point (default: center-top) */
  origin?: { x: number; y: number };
  /** Colors to use */
  colors?: string[];
  /** Fire even if already shown this session */
  force?: boolean;
}

const DEFAULT_COLORS = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444"];

/**
 * useConfetti - Hook for triggering confetti celebrations
 *
 * Fires once per session by default (uses sessionStorage).
 * Respects prefers-reduced-motion.
 *
 * @example
 * const { fire, fireOnce, hasShown } = useConfetti();
 *
 * // Fire once (won't fire again this session)
 * fireOnce();
 *
 * // Force fire (always fires)
 * fire({ force: true });
 */
export function useConfetti() {
  const hasShownRef = useRef(false);

  // Check if already shown this session
  const hasShown = useCallback((): boolean => {
    if (typeof window === "undefined") return true;
    return sessionStorage.getItem(SESSION_KEY) === "true" || hasShownRef.current;
  }, []);

  // Mark as shown
  const markShown = useCallback((): void => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(SESSION_KEY, "true");
    hasShownRef.current = true;
  }, []);

  // Check for reduced motion preference
  const prefersReducedMotion = useCallback((): boolean => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Fire confetti
  const fire = useCallback(
    (options: ConfettiOptions = {}): void => {
      const {
        particleCount = 100,
        spread = 70,
        origin = { x: 0.5, y: 0.3 },
        colors = DEFAULT_COLORS,
        force = false,
      } = options;

      // Don't fire if reduced motion preferred
      if (prefersReducedMotion()) return;

      // Don't fire if already shown (unless forced)
      if (!force && hasShown()) return;

      // Fire the confetti
      confetti({
        particleCount,
        spread,
        origin,
        colors,
        disableForReducedMotion: true,
      });

      markShown();
    },
    [hasShown, markShown, prefersReducedMotion]
  );

  // Fire only once per session (convenience method)
  const fireOnce = useCallback(
    (options: Omit<ConfettiOptions, "force"> = {}): void => {
      fire({ ...options, force: false });
    },
    [fire]
  );

  // Fire a burst from both sides (celebration effect)
  const fireBurst = useCallback(
    (options: Omit<ConfettiOptions, "origin"> = {}): void => {
      const { particleCount = 50, spread = 55, colors = DEFAULT_COLORS, force = false } = options;

      if (prefersReducedMotion()) return;
      if (!force && hasShown()) return;

      // Left side
      confetti({
        particleCount,
        spread,
        origin: { x: 0.1, y: 0.6 },
        colors,
        angle: 60,
        disableForReducedMotion: true,
      });

      // Right side
      confetti({
        particleCount,
        spread,
        origin: { x: 0.9, y: 0.6 },
        colors,
        angle: 120,
        disableForReducedMotion: true,
      });

      markShown();
    },
    [hasShown, markShown, prefersReducedMotion]
  );

  // Reset shown state (for testing)
  const reset = useCallback((): void => {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(SESSION_KEY);
    hasShownRef.current = false;
  }, []);

  return {
    fire,
    fireOnce,
    fireBurst,
    hasShown,
    reset,
  };
}
