

import * as React from "react"
import { motion, Variants } from "framer-motion"
import { cn } from "@/lib/utils"
import { DURATION, EASE, SPRING, prefersReducedMotion } from "@/lib/motion"

// ===== Hook: useHoverState =====

export interface HoverState {
  isHovered: boolean
  isPressed: boolean
  isFocused: boolean
  handlers: {
    onMouseEnter: () => void
    onMouseLeave: () => void
    onMouseDown: () => void
    onMouseUp: () => void
    onFocus: () => void
    onBlur: () => void
  }
}

/**
 * Hook for managing hover, press, and focus states.
 *
 * @example
 * const { isHovered, isPressed, handlers } = useHoverState()
 * <div {...handlers} className={isHovered ? "hovered" : ""}>
 */
export function useHoverState(): HoverState {
  const [isHovered, setIsHovered] = React.useState(false)
  const [isPressed, setIsPressed] = React.useState(false)
  const [isFocused, setIsFocused] = React.useState(false)

  const handlers = React.useMemo(
    () => ({
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => {
        setIsHovered(false)
        setIsPressed(false)
      },
      onMouseDown: () => setIsPressed(true),
      onMouseUp: () => setIsPressed(false),
      onFocus: () => setIsFocused(true),
      onBlur: () => setIsFocused(false),
    }),
    []
  )

  return { isHovered, isPressed, isFocused, handlers }
}

// ===== Hook: useReducedMotion (re-export for convenience) =====

export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = React.useState(() => prefersReducedMotion())

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches)
    }

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }
    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  return reducedMotion
}

// ===== Variants =====

const cardHoverVariants: Variants = {
  rest: {
    y: 0,
    scale: 1,
    boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  },
  hover: {
    y: -2,
    scale: 1,
    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    transition: { duration: DURATION.fast, ease: EASE.outExpo },
  },
  tap: {
    y: 0,
    scale: 0.98,
    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    transition: { duration: DURATION.instant },
  },
}

const scaleUpVariants: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.05, transition: { duration: DURATION.fast, ease: EASE.outExpo } },
  tap: { scale: 0.95, transition: { duration: DURATION.instant } },
}

const scaleDownVariants: Variants = {
  rest: { scale: 1 },
  hover: { scale: 0.95, transition: { duration: DURATION.fast, ease: EASE.outExpo } },
  tap: { scale: 0.9, transition: { duration: DURATION.instant } },
}

const scaleSubtleVariants: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: DURATION.fast, ease: EASE.outExpo } },
  tap: { scale: 0.98, transition: { duration: DURATION.instant } },
}

const buttonPressVariants: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: DURATION.fast, ease: EASE.outExpo } },
  tap: { scale: 0.96, transition: SPRING.snappy },
}

const imageZoomVariants: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.1, transition: { duration: DURATION.slow, ease: EASE.outExpo } },
}

// ===== HoverCard Component =====

export interface HoverCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Lift amount in pixels (default: 2) */
  lift?: number
  /** Whether to show tap feedback */
  tapFeedback?: boolean
  /** Shadow intensity: 'sm' | 'md' | 'lg' */
  shadowIntensity?: "sm" | "md" | "lg"
  children: React.ReactNode
}

/**
 * Card with lift effect on hover.
 * Moves up and increases shadow on hover.
 *
 * @example
 * <HoverCard lift={4} shadowIntensity="lg">
 *   <CardContent />
 * </HoverCard>
 */
export const HoverCard = React.forwardRef<HTMLDivElement, HoverCardProps>(
  ({ lift = 2, tapFeedback = true, shadowIntensity = "md", className, children, ...props }, ref) => {
    const reducedMotion = useReducedMotion()

    // Custom variants based on props
    const customVariants: Variants = {
      rest: {
        y: 0,
        boxShadow:
          shadowIntensity === "sm"
            ? "0 1px 2px 0 rgb(0 0 0 / 0.05)"
            : shadowIntensity === "lg"
            ? "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"
            : "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
      },
      hover: {
        y: -lift,
        boxShadow:
          shadowIntensity === "sm"
            ? "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"
            : shadowIntensity === "lg"
            ? "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
            : "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        transition: { duration: DURATION.fast, ease: EASE.outExpo },
      },
      ...(tapFeedback && {
        tap: {
          y: 0,
          scale: 0.98,
          boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
          transition: { duration: DURATION.instant },
        },
      }),
    }

    if (reducedMotion) {
      return (
        <div ref={ref} className={cn("rounded-lg", className)} {...props}>
          {children}
        </div>
      )
    }

    return (
      <motion.div
        ref={ref}
        initial="rest"
        whileHover="hover"
        whileTap={tapFeedback ? "tap" : undefined}
        variants={customVariants}
        className={cn("rounded-lg", className)}
      >
        {children}
      </motion.div>
    )
  }
)
HoverCard.displayName = "HoverCard"

// ===== HoverScale Component =====

export type ScaleType = "up" | "down" | "subtle"

export interface HoverScaleProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Scale direction: 'up' | 'down' | 'subtle' */
  type?: ScaleType
  /** Custom scale value (overrides type) */
  scale?: number
  /** Whether to show tap feedback */
  tapFeedback?: boolean
  children: React.ReactNode
}

/**
 * Scale element on hover.
 *
 * @example
 * <HoverScale type="up">
 *   <Avatar />
 * </HoverScale>
 */
export const HoverScale = React.forwardRef<HTMLDivElement, HoverScaleProps>(
  ({ type = "subtle", scale: customScale, tapFeedback = true, className, children, ...props }, ref) => {
    const reducedMotion = useReducedMotion()

    // Get scale value
    const scaleValue =
      customScale ?? (type === "up" ? 1.05 : type === "down" ? 0.95 : 1.02)
    const tapScale = type === "down" ? 0.9 : 0.96

    const customVariants: Variants = {
      rest: { scale: 1 },
      hover: { scale: scaleValue, transition: { duration: DURATION.fast, ease: EASE.outExpo } },
      ...(tapFeedback && {
        tap: { scale: tapScale, transition: { duration: DURATION.instant } },
      }),
    }

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
        initial="rest"
        whileHover="hover"
        whileTap={tapFeedback ? "tap" : undefined}
        variants={customVariants}
        className={className}
      >
        {children}
      </motion.div>
    )
  }
)
HoverScale.displayName = "HoverScale"

// ===== HoverGlow Component =====

export interface HoverGlowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Glow color (CSS color value) */
  color?: string
  /** Glow intensity: 'sm' | 'md' | 'lg' */
  intensity?: "sm" | "md" | "lg"
  /** Glow spread in pixels */
  spread?: number
  children: React.ReactNode
}

/**
 * Element with glow effect on hover.
 *
 * @example
 * <HoverGlow color="rgb(59, 130, 246)" intensity="md">
 *   <Button>Click me</Button>
 * </HoverGlow>
 */
export const HoverGlow = React.forwardRef<HTMLDivElement, HoverGlowProps>(
  (
    {
      color = "rgb(59, 130, 246)",
      intensity = "md",
      spread: customSpread,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const reducedMotion = useReducedMotion()

    const spread =
      customSpread ?? (intensity === "sm" ? 10 : intensity === "lg" ? 30 : 20)
    const opacity = intensity === "sm" ? 0.3 : intensity === "lg" ? 0.6 : 0.4

    // Extract RGB values for shadow
    const glowShadow = `0 0 ${spread}px ${color.replace(")", ` / ${opacity})`).replace("rgb(", "rgba(")}`

    const variants: Variants = {
      rest: { boxShadow: "0 0 0 transparent" },
      hover: {
        boxShadow: glowShadow,
        transition: { duration: DURATION.normal, ease: EASE.outExpo },
      },
    }

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
        initial="rest"
        whileHover="hover"
        variants={variants}
        className={className}
      >
        {children}
      </motion.div>
    )
  }
)
HoverGlow.displayName = "HoverGlow"

// ===== HoverUnderline Component =====

export type UnderlineDirection = "left" | "right" | "center"

export interface HoverUnderlineProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Underline color (uses currentColor by default) */
  color?: string
  /** Underline thickness in pixels */
  thickness?: number
  /** Animation direction: 'left' | 'right' | 'center' */
  direction?: UnderlineDirection
  /** Offset from text bottom in pixels */
  offset?: number
  children: React.ReactNode
}

/**
 * Text with animated underline on hover.
 *
 * @example
 * <HoverUnderline direction="left">
 *   <a href="/about">About us</a>
 * </HoverUnderline>
 */
export const HoverUnderline = React.forwardRef<HTMLSpanElement, HoverUnderlineProps>(
  (
    {
      color,
      thickness = 2,
      direction = "left",
      offset = 0,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const reducedMotion = useReducedMotion()

    // Determine transform origin based on direction
    const transformOrigin =
      direction === "left"
        ? "left center"
        : direction === "right"
        ? "right center"
        : "center center"

    const underlineVariants: Variants = {
      rest: {
        scaleX: 0,
        opacity: 0,
      },
      hover: {
        scaleX: 1,
        opacity: 1,
        transition: { duration: DURATION.fast, ease: EASE.outExpo },
      },
    }

    if (reducedMotion) {
      return (
        <span ref={ref} className={cn("relative inline-block", className)} {...props}>
          {children}
        </span>
      )
    }

    return (
      <motion.span
        ref={ref}
        initial="rest"
        whileHover="hover"
        className={cn("relative inline-block", className)}
      >
        {children}
        <motion.span
          variants={underlineVariants}
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            height: thickness,
            bottom: offset,
            backgroundColor: color || "currentColor",
            transformOrigin,
          }}
          aria-hidden="true"
        />
      </motion.span>
    )
  }
)
HoverUnderline.displayName = "HoverUnderline"

// ===== HoverImage Component =====

export interface HoverImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Zoom scale on hover (default: 1.1) */
  zoom?: number
  /** Whether to have overflow hidden container */
  contained?: boolean
  /** Container border radius */
  rounded?: "none" | "sm" | "md" | "lg" | "full"
}

/**
 * Image with zoom effect on hover.
 *
 * @example
 * <HoverImage
 *   src="/photo.jpg"
 *   alt="Photo"
 *   zoom={1.15}
 *   contained
 *   rounded="lg"
 * />
 */
export const HoverImage = React.forwardRef<HTMLImageElement, HoverImageProps>(
  (
    { zoom = 1.1, contained = true, rounded = "none", className, style, ...props },
    ref
  ) => {
    const reducedMotion = useReducedMotion()

    const borderRadiusMap = {
      none: "0",
      sm: "0.125rem",
      md: "0.375rem",
      lg: "0.5rem",
      full: "9999px",
    }

    const imageVariants: Variants = {
      rest: { scale: 1 },
      hover: { scale: zoom, transition: { duration: DURATION.slow, ease: EASE.outExpo } },
    }

    // Extract only the img-specific props we need
    const { src, alt, width, height, loading, srcSet, sizes, ...restProps } = props

    const imageContent = reducedMotion ? (
      <img
        ref={ref}
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        srcSet={srcSet}
        sizes={sizes}
        className={cn("w-full h-full object-cover", className)}
      />
    ) : (
      <motion.img
        ref={ref}
        initial="rest"
        whileHover="hover"
        variants={imageVariants}
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        srcSet={srcSet}
        sizes={sizes}
        className={cn("w-full h-full object-cover", className)}
      />
    )

    if (contained) {
      return (
        <div
          className="overflow-hidden"
          style={{ borderRadius: borderRadiusMap[rounded], ...style }}
        >
          {imageContent}
        </div>
      )
    }

    return imageContent
  }
)
HoverImage.displayName = "HoverImage"

// ===== HoverButton Component =====

export interface HoverButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Press animation style: 'scale' | 'spring' */
  pressStyle?: "scale" | "spring"
  children: React.ReactNode
}

/**
 * Button with press feedback animation.
 *
 * @example
 * <HoverButton pressStyle="spring" onClick={handleClick}>
 *   Click me
 * </HoverButton>
 */
export const HoverButton = React.forwardRef<HTMLButtonElement, HoverButtonProps>(
  ({ pressStyle = "scale", className, children, ...props }, ref) => {
    const reducedMotion = useReducedMotion()

    const variants: Variants = {
      rest: { scale: 1 },
      hover: { scale: 1.02, transition: { duration: DURATION.fast, ease: EASE.outExpo } },
      tap:
        pressStyle === "spring"
          ? { scale: 0.96, transition: SPRING.snappy }
          : { scale: 0.96, transition: { duration: DURATION.instant } },
    }

    if (reducedMotion) {
      return (
        <button ref={ref} className={className} {...props}>
          {children}
        </button>
      )
    }

    // Extract button-specific props
    const { type, disabled, onClick, onFocus, onBlur, ...restProps } = props

    return (
      <motion.button
        ref={ref}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        variants={variants}
        className={className}
        type={type}
        disabled={disabled}
        onClick={onClick}
        onFocus={onFocus}
        onBlur={onBlur}
      >
        {children}
      </motion.button>
    )
  }
)
HoverButton.displayName = "HoverButton"

// ===== CSS Hover Classes =====

/**
 * Tailwind CSS hover utility classes.
 * Use for simple hover effects without Framer Motion.
 *
 * @example
 * <div className={hoverClasses.lift}>Card</div>
 */
export const hoverClasses = {
  // Lift effects
  lift: "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
  liftSm: "transition-all duration-150 hover:-translate-y-px hover:shadow-md",
  liftLg: "transition-all duration-200 hover:-translate-y-1 hover:shadow-xl",

  // Scale effects
  scale: "transition-transform duration-150 hover:scale-105",
  scaleSubtle: "transition-transform duration-150 hover:scale-[1.02]",
  scaleSm: "transition-transform duration-150 hover:scale-[1.03]",
  scaleLg: "transition-transform duration-150 hover:scale-110",

  // Opacity effects
  fade: "transition-opacity duration-150 hover:opacity-80",
  fadeSubtle: "transition-opacity duration-150 hover:opacity-90",
  fadeDark: "transition-opacity duration-150 hover:opacity-70",

  // Background effects
  bgHover: "transition-colors duration-150 hover:bg-muted",
  bgHoverAccent: "transition-colors duration-150 hover:bg-accent",
  bgHoverPrimary: "transition-colors duration-150 hover:bg-primary/10",

  // Border effects
  borderHover: "transition-colors duration-150 hover:border-primary",
  borderAccent: "transition-colors duration-150 hover:border-accent",

  // Shadow effects
  shadowHover: "transition-shadow duration-200 hover:shadow-md",
  shadowHoverLg: "transition-shadow duration-200 hover:shadow-lg",
  shadowHoverXl: "transition-shadow duration-200 hover:shadow-xl",

  // Underline effects (for links)
  underline: "relative after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-current after:transition-all after:duration-200 hover:after:w-full",
  underlineCenter: "relative after:absolute after:bottom-0 after:left-1/2 after:h-px after:w-0 after:bg-current after:transition-all after:duration-200 after:-translate-x-1/2 hover:after:w-full",

  // Text effects
  textHover: "transition-colors duration-150 hover:text-primary",
  textHoverMuted: "transition-colors duration-150 hover:text-foreground",

  // Ring effects
  ringHover: "transition-shadow duration-150 hover:ring-2 hover:ring-primary hover:ring-offset-2",
  ringHoverSubtle: "transition-shadow duration-150 hover:ring-1 hover:ring-border",

  // Combined effects
  card: "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/20",
  button: "transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]",
  link: "transition-colors duration-150 hover:text-primary hover:underline",
  icon: "transition-all duration-150 hover:scale-110 hover:text-primary",

  // Reduced motion support
  motionSafe: "motion-safe:transition-all motion-safe:duration-200",
  motionReduce: "motion-reduce:transition-none motion-reduce:transform-none",
} as const

/**
 * Get combined hover classes with reduced motion support.
 */
export function getHoverClasses(
  ...classes: (keyof typeof hoverClasses)[]
): string {
  return cn(
    classes.map((c) => hoverClasses[c]),
    hoverClasses.motionReduce
  )
}

// ===== Exports =====

export {
  // Variants for custom use
  cardHoverVariants,
  scaleUpVariants,
  scaleDownVariants,
  scaleSubtleVariants,
  buttonPressVariants,
  imageZoomVariants,
}
