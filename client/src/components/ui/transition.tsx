

import * as React from "react"
import { motion, AnimatePresence, Variants, type Transition as MotionTransition } from "framer-motion"
import { cn } from "@/lib/utils"
import {
  DURATION,
  EASE,
  SPRING,
  STAGGER,
  prefersReducedMotion,
  getSafeTransition,
  fadeIn,
  fadeInUp,
  fadeInDown,
  scaleIn,
  slideUp,
  slideDown,
  slideLeft,
  slideRight,
  staggerContainer,
  staggerItem,
} from "@/lib/motion"

// ===== Types =====

export type TransitionPreset =
  | "fade"
  | "fadeUp"
  | "fadeDown"
  | "slideUp"
  | "slideDown"
  | "slideLeft"
  | "slideRight"
  | "scale"
  | "scaleSpring"
  | "rotate"
  | "none"

export type TransitionDuration = "instant" | "fast" | "normal" | "slow" | "slower" | "slowest"

export type TransitionEasing = "default" | "outExpo" | "inExpo" | "inOut" | "spring" | "emphasized"

export interface TransitionState {
  /** Whether the element is currently visible */
  isVisible: boolean
  /** Whether the transition is currently animating */
  isAnimating: boolean
  /** Trigger show animation */
  show: () => void
  /** Trigger hide animation */
  hide: () => void
  /** Toggle visibility */
  toggle: () => void
}

// ===== Hook: useReducedMotion =====

/**
 * Hook to check user's reduced motion preference.
 * Updates reactively when preference changes.
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = React.useState(() => prefersReducedMotion())

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches)
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }
    // Legacy browsers
    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  return reducedMotion
}

// ===== Hook: useTransitionState =====

/**
 * Hook for programmatic transition control.
 * Returns state and methods to show/hide elements with animation.
 *
 * @example
 * const { isVisible, show, hide, toggle, isAnimating } = useTransitionState({ initialVisible: false })
 */
export function useTransition(options: {
  initialVisible?: boolean
  onShow?: () => void
  onHide?: () => void
  onAnimationStart?: () => void
  onAnimationComplete?: () => void
} = {}): TransitionState {
  const {
    initialVisible = true,
    onShow,
    onHide,
    onAnimationStart,
    onAnimationComplete,
  } = options

  const [isVisible, setIsVisible] = React.useState(initialVisible)
  const [isAnimating, setIsAnimating] = React.useState(false)

  const show = React.useCallback(() => {
    setIsVisible(true)
    setIsAnimating(true)
    onShow?.()
    onAnimationStart?.()
  }, [onShow, onAnimationStart])

  const hide = React.useCallback(() => {
    setIsVisible(false)
    setIsAnimating(true)
    onHide?.()
    onAnimationStart?.()
  }, [onHide, onAnimationStart])

  const toggle = React.useCallback(() => {
    if (isVisible) {
      hide()
    } else {
      show()
    }
  }, [isVisible, show, hide])

  return {
    isVisible,
    isAnimating,
    show,
    hide,
    toggle,
  }
}

// ===== Preset Variants =====

const rotateVariants: Variants = {
  hidden: { opacity: 0, rotate: -10 },
  visible: {
    opacity: 1,
    rotate: 0,
    transition: { duration: DURATION.normal, ease: EASE.outExpo },
  },
  exit: {
    opacity: 0,
    rotate: 10,
    transition: { duration: DURATION.fast, ease: EASE.inExpo },
  },
}

const scaleSpringVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: SPRING.bouncy,
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: DURATION.fast },
  },
}

const presetVariants: Record<TransitionPreset, Variants | null> = {
  fade: fadeIn,
  fadeUp: fadeInUp,
  fadeDown: fadeInDown,
  slideUp: slideUp,
  slideDown: slideDown,
  slideLeft: slideLeft,
  slideRight: slideRight,
  scale: scaleIn,
  scaleSpring: scaleSpringVariants,
  rotate: rotateVariants,
  none: null,
}

// ===== Base Transition Component =====

export interface TransitionProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Animation preset to use */
  preset?: TransitionPreset
  /** Custom variants (overrides preset) */
  variants?: Variants
  /** Whether the element is visible */
  show?: boolean
  /** Animation duration preset */
  duration?: TransitionDuration
  /** Easing function */
  easing?: TransitionEasing
  /** Delay before animation starts (in seconds) */
  delay?: number
  /** Whether to render when hidden (for exit animations) */
  unmountOnHide?: boolean
  /** Callback when animation completes */
  onAnimationComplete?: () => void
  /** Callback when animation starts */
  onAnimationStart?: () => void
  /** Children to animate */
  children: React.ReactNode
}

/**
 * Base Transition component.
 * Wraps content with configurable animation using Framer Motion.
 *
 * @example
 * <Transition preset="fadeUp" show={isOpen}>
 *   <Card>Content</Card>
 * </Transition>
 */
export const Transition = React.forwardRef<HTMLDivElement, TransitionProps>(
  (
    {
      preset = "fade",
      variants: customVariants,
      show = true,
      duration = "normal",
      easing = "outExpo",
      delay = 0,
      unmountOnHide = true,
      onAnimationComplete,
      onAnimationStart,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const reducedMotion = useReducedMotion()

    // Build transition config
    const transition: MotionTransition = {
      duration: DURATION[duration],
      ease: easing === "spring" ? undefined : EASE[easing],
      delay,
      ...(easing === "spring" ? SPRING.snappy : {}),
    }

    // Get variants
    const variants = customVariants || presetVariants[preset]

    // If reduced motion or no variants, render without animation
    if (reducedMotion || !variants || preset === "none") {
      if (unmountOnHide && !show) {
        return null
      }
      return (
        <div ref={ref} className={className} {...props}>
          {children}
        </div>
      )
    }

    const content = (
      <motion.div
        ref={ref}
        initial="hidden"
        animate={show ? "visible" : "hidden"}
        exit="exit"
        variants={variants}
        transition={transition}
        onAnimationStart={onAnimationStart}
        onAnimationComplete={onAnimationComplete}
        className={className}
      >
        {children}
      </motion.div>
    )

    if (unmountOnHide) {
      return (
        <AnimatePresence mode="wait">
          {show && content}
        </AnimatePresence>
      )
    }

    return content
  }
)
Transition.displayName = "Transition"

// ===== Convenience Components =====

export interface FadeTransitionProps extends Omit<TransitionProps, "preset"> {
  /** Direction: 'up', 'down', or 'none' (pure fade) */
  direction?: "up" | "down" | "none"
}

/**
 * Fade transition with optional directional movement.
 *
 * @example
 * <FadeTransition direction="up" show={isOpen}>
 *   <Content />
 * </FadeTransition>
 */
export const FadeTransition = React.forwardRef<HTMLDivElement, FadeTransitionProps>(
  ({ direction = "none", ...props }, ref) => {
    const preset: TransitionPreset =
      direction === "up" ? "fadeUp" : direction === "down" ? "fadeDown" : "fade"
    return <Transition ref={ref} preset={preset} {...props} />
  }
)
FadeTransition.displayName = "FadeTransition"

export interface SlideTransitionProps extends Omit<TransitionProps, "preset"> {
  /** Direction to slide from */
  direction?: "up" | "down" | "left" | "right"
}

/**
 * Slide transition from any direction.
 *
 * @example
 * <SlideTransition direction="left" show={isOpen}>
 *   <Panel />
 * </SlideTransition>
 */
export const SlideTransition = React.forwardRef<HTMLDivElement, SlideTransitionProps>(
  ({ direction = "up", ...props }, ref) => {
    const presetMap: Record<string, TransitionPreset> = {
      up: "slideUp",
      down: "slideDown",
      left: "slideLeft",
      right: "slideRight",
    }
    return <Transition ref={ref} preset={presetMap[direction]} {...props} />
  }
)
SlideTransition.displayName = "SlideTransition"

export interface ScaleTransitionProps extends Omit<TransitionProps, "preset"> {
  /** Use spring animation for bouncy effect */
  spring?: boolean
}

/**
 * Scale transition with optional spring bounce.
 *
 * @example
 * <ScaleTransition spring show={isOpen}>
 *   <Modal />
 * </ScaleTransition>
 */
export const ScaleTransition = React.forwardRef<HTMLDivElement, ScaleTransitionProps>(
  ({ spring = false, ...props }, ref) => {
    return <Transition ref={ref} preset={spring ? "scaleSpring" : "scale"} {...props} />
  }
)
ScaleTransition.displayName = "ScaleTransition"

export interface RotateTransitionProps extends Omit<TransitionProps, "preset"> {}

/**
 * Rotate transition for playful reveals.
 *
 * @example
 * <RotateTransition show={isOpen}>
 *   <Icon />
 * </RotateTransition>
 */
export const RotateTransition = React.forwardRef<HTMLDivElement, RotateTransitionProps>(
  (props, ref) => {
    return <Transition ref={ref} preset="rotate" {...props} />
  }
)
RotateTransition.displayName = "RotateTransition"

// ===== Staggered List =====

export interface StaggeredListProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether the list is visible */
  show?: boolean
  /** Stagger delay between items */
  stagger?: "fast" | "normal" | "slow"
  /** Initial delay before stagger starts */
  delayChildren?: number
  /** Item animation preset */
  itemPreset?: TransitionPreset
  /** Custom item variants */
  itemVariants?: Variants
  /** Children (should be array) */
  children: React.ReactNode
}

/**
 * List container that staggers children animations.
 *
 * @example
 * <StaggeredList show={isLoaded} stagger="normal">
 *   {items.map(item => (
 *     <div key={item.id}>{item.name}</div>
 *   ))}
 * </StaggeredList>
 */
export const StaggeredList = React.forwardRef<HTMLDivElement, StaggeredListProps>(
  (
    {
      show = true,
      stagger = "normal",
      delayChildren = 0.1,
      itemPreset = "fadeUp",
      itemVariants: customItemVariants,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const reducedMotion = useReducedMotion()

    // Custom container variants with configurable stagger
    const containerVariants: Variants = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: STAGGER[stagger],
          delayChildren,
        },
      },
      exit: {
        opacity: 0,
        transition: {
          staggerChildren: STAGGER.fast,
          staggerDirection: -1,
        },
      },
    }

    // Get item variants
    const itemVariants = customItemVariants || presetVariants[itemPreset] || staggerItem

    // If reduced motion, render without animation
    if (reducedMotion) {
      return (
        <div ref={ref} className={className} {...props}>
          {children}
        </div>
      )
    }

    return (
      <AnimatePresence mode="wait">
        {show && (
          <motion.div
            ref={ref}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={containerVariants}
            className={className}
          >
            {React.Children.map(children, (child, index) => {
              if (!React.isValidElement(child)) return child

              return (
                <motion.div
                  key={child.key || index}
                  variants={itemVariants}
                >
                  {child}
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    )
  }
)
StaggeredList.displayName = "StaggeredList"

// ===== Staggered Item (for manual control) =====

export interface StaggeredItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Animation preset for the item */
  preset?: TransitionPreset
  /** Custom variants */
  variants?: Variants
  children: React.ReactNode
}

/**
 * Individual item for use within a parent stagger container.
 * Use when you need more control over item rendering.
 *
 * @example
 * <motion.ul variants={staggerContainer} initial="hidden" animate="visible">
 *   {items.map(item => (
 *     <StaggeredItem key={item.id} preset="fadeUp">
 *       {item.name}
 *     </StaggeredItem>
 *   ))}
 * </motion.ul>
 */
export const StaggeredItem = React.forwardRef<HTMLDivElement, StaggeredItemProps>(
  ({ preset = "fadeUp", variants: customVariants, className, children, ...props }, ref) => {
    const reducedMotion = useReducedMotion()
    const variants = customVariants || presetVariants[preset] || staggerItem

    if (reducedMotion) {
      return (
        <div ref={ref} className={className} {...props}>
          {children}
        </div>
      )
    }

    return (
      <motion.div
        ref={ref}
        variants={variants}
        className={className}
      >
        {children}
      </motion.div>
    )
  }
)
StaggeredItem.displayName = "StaggeredItem"

// ===== Animated Presence Wrapper =====

export interface AnimatedPresenceProps {
  /** Whether to wait for exit animations before mounting new children */
  mode?: "sync" | "wait" | "popLayout"
  /** Initial animation on mount */
  initial?: boolean
  /** Custom key for AnimatePresence */
  presenceKey?: string
  /** Callback when all exit animations complete */
  onExitComplete?: () => void
  children: React.ReactNode
}

/**
 * Wrapper around Framer Motion's AnimatePresence with sensible defaults.
 * Use to enable exit animations when components unmount.
 *
 * @example
 * <AnimatedPresence mode="wait">
 *   {isOpen && (
 *     <Transition preset="scale">
 *       <Modal />
 *     </Transition>
 *   )}
 * </AnimatedPresence>
 */
export function AnimatedPresenceWrapper({
  mode = "wait",
  initial = true,
  presenceKey,
  onExitComplete,
  children,
}: AnimatedPresenceProps) {
  return (
    <AnimatePresence
      mode={mode}
      initial={initial}
      onExitComplete={onExitComplete}
    >
      {children}
    </AnimatePresence>
  )
}

// ===== CSS Transition Classes =====

/**
 * Tailwind CSS transition utility classes.
 * Use for simple transitions without Framer Motion.
 *
 * @example
 * <div className={cn(transitionClasses.fadeIn, "other-classes")}>
 *   Content
 * </div>
 */
export const transitionClasses = {
  // Base transitions
  base: "transition-all",
  fast: "transition-all duration-150",
  normal: "transition-all duration-200",
  slow: "transition-all duration-300",

  // Specific property transitions
  opacity: "transition-opacity",
  transform: "transition-transform",
  colors: "transition-colors",
  shadow: "transition-shadow",

  // Timing functions
  easeDefault: "ease-[cubic-bezier(0.4,0,0.2,1)]",
  easeIn: "ease-in",
  easeOut: "ease-out",
  easeInOut: "ease-in-out",
  easeOutExpo: "ease-[cubic-bezier(0.16,1,0.3,1)]",

  // Enter animations (use with animate-in from tailwindcss-animate)
  fadeIn: "animate-in fade-in",
  fadeInUp: "animate-in fade-in slide-in-from-bottom-2",
  fadeInDown: "animate-in fade-in slide-in-from-top-2",
  fadeInLeft: "animate-in fade-in slide-in-from-right-2",
  fadeInRight: "animate-in fade-in slide-in-from-left-2",
  scaleIn: "animate-in zoom-in-95",
  slideInUp: "animate-in slide-in-from-bottom-4",
  slideInDown: "animate-in slide-in-from-top-4",
  slideInLeft: "animate-in slide-in-from-right-4",
  slideInRight: "animate-in slide-in-from-left-4",

  // Exit animations (use with animate-out from tailwindcss-animate)
  fadeOut: "animate-out fade-out",
  fadeOutUp: "animate-out fade-out slide-out-to-top-2",
  fadeOutDown: "animate-out fade-out slide-out-to-bottom-2",
  fadeOutLeft: "animate-out fade-out slide-out-to-left-2",
  fadeOutRight: "animate-out fade-out slide-out-to-right-2",
  scaleOut: "animate-out zoom-out-95",
  slideOutUp: "animate-out slide-out-to-top-4",
  slideOutDown: "animate-out slide-out-to-bottom-4",
  slideOutLeft: "animate-out slide-out-to-left-4",
  slideOutRight: "animate-out slide-out-to-right-4",

  // Duration modifiers
  duration50: "duration-50",
  duration75: "duration-75",
  duration100: "duration-100",
  duration150: "duration-150",
  duration200: "duration-200",
  duration300: "duration-300",
  duration500: "duration-500",

  // Reduced motion
  motionSafe: "motion-safe:transition-all motion-safe:duration-200",
  motionReduce: "motion-reduce:transition-none motion-reduce:animate-none",
} as const

/**
 * Helper to apply motion-safe transitions.
 * Transitions only apply when user hasn't set prefers-reduced-motion.
 */
export function getMotionSafeClasses(
  transitionType: keyof typeof transitionClasses = "normal"
): string {
  return cn(
    transitionClasses[transitionType],
    transitionClasses.motionReduce
  )
}

// ===== Exports =====

export {
  // Re-export motion utilities
  DURATION,
  EASE,
  SPRING,
  STAGGER,
  prefersReducedMotion,
  getSafeTransition,
  // Re-export common variants
  fadeIn,
  fadeInUp,
  fadeInDown,
  scaleIn,
  slideUp,
  slideDown,
  slideLeft,
  slideRight,
  staggerContainer,
  staggerItem,
}
