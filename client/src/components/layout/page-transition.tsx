import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fadeInUp, DURATION } from "@/lib/motion";

interface PageTransitionProps {
  children: React.ReactNode;
  /** Unique key for the page - typically the route path */
  pageKey: string;
  /** Optional className for the motion wrapper */
  className?: string;
}

/**
 * PageTransition
 *
 * Wraps page content with fade + slide animation using Framer Motion.
 * Uses AnimatePresence for exit animations when navigating between pages.
 *
 * Usage:
 * ```tsx
 * <PageTransition pageKey={location.pathname}>
 *   <YourPageContent />
 * </PageTransition>
 * ```
 */
export function PageTransition({
  children,
  pageKey,
  className
}: PageTransitionProps) {
  // Check for reduced motion preference
  const prefersReducedMotion = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Skip animation if user prefers reduced motion
  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={fadeInUp}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Simplified page transition without AnimatePresence
 * Use when you don't need exit animations (single page sections)
 */
export function PageFadeIn({
  children,
  className,
  delay = 0
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const prefersReducedMotion = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: DURATION.normal,
        delay,
        ease: [0.16, 1, 0.3, 1], // ease-out-expo
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default PageTransition;
