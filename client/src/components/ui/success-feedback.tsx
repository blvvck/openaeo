

import * as React from "react"
import { motion, AnimatePresence, Variants } from "framer-motion"
import { cva, type VariantProps } from "class-variance-authority"
import { Check, CheckCircle, CheckCircle2, PartyPopper, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { DURATION, EASE, SPRING, prefersReducedMotion } from "@/lib/motion"

// ===== Animation Variants =====

export const successFadeIn: Variants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.normal, ease: EASE.outExpo },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: DURATION.fast },
  },
}

export const successScaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 400, damping: 15 },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: DURATION.fast },
  },
}

export const checkmarkDraw: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: DURATION.slow, ease: EASE.outExpo, delay: 0.1 },
  },
}

export const circleGrow: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 20 },
  },
}

export const bannerSlideDown: Variants = {
  hidden: { y: "-100%", opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: DURATION.normal, ease: EASE.outExpo },
  },
  exit: {
    y: "-100%",
    opacity: 0,
    transition: { duration: DURATION.fast },
  },
}

// ===== SuccessIcon Component =====

export interface SuccessIconProps {
  /** Size of the icon */
  size?: "sm" | "md" | "lg" | "xl"
  /** Variant style */
  variant?: "default" | "outline" | "solid"
  /** Whether to animate */
  animate?: boolean
  /** Animation complete callback */
  onAnimationComplete?: () => void
  /** Custom className */
  className?: string
  /** Custom style */
  style?: React.CSSProperties
  /** Element id */
  id?: string
  /** Test id */
  "data-testid"?: string
}

const iconSizes = {
  sm: { wrapper: "w-8 h-8", icon: "w-4 h-4", stroke: 2 },
  md: { wrapper: "w-12 h-12", icon: "w-6 h-6", stroke: 2 },
  lg: { wrapper: "w-16 h-16", icon: "w-8 h-8", stroke: 2.5 },
  xl: { wrapper: "w-24 h-24", icon: "w-12 h-12", stroke: 3 },
}

const iconVariants = {
  default: "bg-success/10 text-success",
  outline: "border-2 border-success text-success",
  solid: "bg-success text-success-foreground",
}

const SuccessIcon = React.forwardRef<HTMLDivElement, SuccessIconProps>(
  (
    {
      size = "md",
      variant = "default",
      animate = true,
      onAnimationComplete,
      className,
      style,
      id,
      "data-testid": dataTestId,
    },
    ref
  ) => {
    const { wrapper, icon, stroke } = iconSizes[size]
    const reducedMotion = prefersReducedMotion()

    const commonProps = {
      id,
      style,
      "data-testid": dataTestId,
    }

    if (reducedMotion || !animate) {
      return (
        <div
          ref={ref}
          className={cn(
            "rounded-full flex items-center justify-center",
            wrapper,
            iconVariants[variant],
            className
          )}
          role="img"
          aria-label="Success"
          {...commonProps}
        >
          <Check className={icon} strokeWidth={stroke} />
        </div>
      )
    }

    return (
      <motion.div
        ref={ref}
        className={cn(
          "rounded-full flex items-center justify-center",
          wrapper,
          iconVariants[variant],
          className
        )}
        variants={circleGrow}
        initial="hidden"
        animate="visible"
        role="img"
        aria-label="Success"
        onAnimationComplete={onAnimationComplete}
        {...commonProps}
      >
        <svg
          className={icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <motion.path
            d="M20 6L9 17L4 12"
            variants={checkmarkDraw}
            initial="hidden"
            animate="visible"
          />
        </svg>
      </motion.div>
    )
  }
)
SuccessIcon.displayName = "SuccessIcon"

// ===== SuccessMessage Component =====

const successMessageVariants = cva(
  "flex items-start gap-3 rounded-lg p-4",
  {
    variants: {
      variant: {
        default: "bg-success/10 text-success-foreground border border-success/20",
        subtle: "bg-success/5 text-foreground",
        outline: "border border-success text-success-foreground",
        solid: "bg-success text-success-foreground",
      },
      size: {
        sm: "p-3 text-sm",
        md: "p-4",
        lg: "p-5 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface SuccessMessageProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof successMessageVariants> {
  /** Title of the success message */
  title?: string
  /** Description/details */
  description?: string
  /** Hide the icon */
  hideIcon?: boolean
  /** Show dismiss button */
  dismissible?: boolean
  /** Dismiss callback */
  onDismiss?: () => void
  /** Action button */
  action?: {
    label: string
    onClick: () => void
  }
  /** Auto-dismiss after ms */
  autoDismiss?: number
}

const SuccessMessage = React.forwardRef<HTMLDivElement, SuccessMessageProps>(
  (
    {
      title,
      description,
      variant,
      size,
      hideIcon = false,
      dismissible = false,
      onDismiss,
      action,
      autoDismiss,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const reducedMotion = prefersReducedMotion()

    // Auto-dismiss effect
    React.useEffect(() => {
      if (autoDismiss && onDismiss) {
        const timer = setTimeout(onDismiss, autoDismiss)
        return () => clearTimeout(timer)
      }
    }, [autoDismiss, onDismiss])

    const content = (
      <div
        ref={ref}
        className={cn(successMessageVariants({ variant, size }), className)}
        role="status"
        aria-live="polite"
        {...props}
      >
        {!hideIcon && (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
        )}
        <div className="flex-1 min-w-0">
          {title && <p className="font-medium">{title}</p>}
          {description && (
            <p className={cn("text-sm", title && "mt-1 opacity-90")}>
              {description}
            </p>
          )}
          {children}
          {action && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 mt-2 text-success underline"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
        </div>
        {dismissible && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 -mr-2 -mt-2 h-8 w-8 hover:bg-success/20"
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    )

    if (reducedMotion) {
      return content
    }

    return (
      <motion.div
        variants={successFadeIn}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {content}
      </motion.div>
    )
  }
)
SuccessMessage.displayName = "SuccessMessage"

// ===== SuccessBanner Component =====

export interface SuccessBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Banner message */
  message: string
  /** Show dismiss button */
  dismissible?: boolean
  /** Dismiss callback */
  onDismiss?: () => void
  /** Action button */
  action?: {
    label: string
    onClick: () => void
  }
  /** Position */
  position?: "top" | "bottom"
}

const SuccessBanner = React.forwardRef<HTMLDivElement, SuccessBannerProps>(
  (
    {
      message,
      dismissible = true,
      onDismiss,
      action,
      position = "top",
      className,
      ...props
    },
    ref
  ) => {
    const reducedMotion = prefersReducedMotion()

    const content = (
      <div
        ref={ref}
        className={cn(
          "w-full bg-success text-success-foreground px-4 py-3",
          "flex items-center justify-center gap-4",
          position === "top" ? "fixed top-0 left-0 right-0 z-50" : "fixed bottom-0 left-0 right-0 z-50",
          className
        )}
        role="status"
        aria-live="polite"
        {...props}
      >
        <CheckCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="font-medium">{message}</span>
        {action && (
          <Button
            variant="secondary"
            size="sm"
            className="bg-success-foreground/20 hover:bg-success-foreground/30 text-success-foreground"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
        {dismissible && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute right-2 hover:bg-success-foreground/20 text-success-foreground"
            onClick={onDismiss}
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    )

    if (reducedMotion) {
      return content
    }

    return (
      <motion.div
        variants={bannerSlideDown}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {content}
      </motion.div>
    )
  }
)
SuccessBanner.displayName = "SuccessBanner"

// ===== SuccessCard Component =====

export interface SuccessCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Title */
  title: string
  /** Description */
  description?: string
  /** Show celebration icon */
  celebrate?: boolean
  /** Primary action */
  primaryAction?: {
    label: string
    onClick: () => void
  }
  /** Secondary action */
  secondaryAction?: {
    label: string
    onClick: () => void
  }
}

const SuccessCard = React.forwardRef<HTMLDivElement, SuccessCardProps>(
  (
    {
      title,
      description,
      celebrate = false,
      primaryAction,
      secondaryAction,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const reducedMotion = prefersReducedMotion()

    const content = (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border bg-card p-6 text-center",
          className
        )}
        role="status"
        aria-live="polite"
        {...props}
      >
        <div className="flex flex-col items-center">
          {celebrate ? (
            <div className="mb-4 p-3 bg-success/10 rounded-full">
              <PartyPopper className="h-8 w-8 text-success" aria-hidden="true" />
            </div>
          ) : (
            <SuccessIcon size="lg" animate={!reducedMotion} className="mb-4" />
          )}
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && (
            <p className="mt-2 text-muted-foreground max-w-sm">{description}</p>
          )}
          {children}
          {(primaryAction || secondaryAction) && (
            <div className="flex gap-3 mt-6">
              {secondaryAction && (
                <Button variant="outline" onClick={secondaryAction.onClick}>
                  {secondaryAction.label}
                </Button>
              )}
              {primaryAction && (
                <Button onClick={primaryAction.onClick}>
                  {primaryAction.label}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    )

    if (reducedMotion) {
      return content
    }

    return (
      <motion.div
        variants={successScaleIn}
        initial="hidden"
        animate="visible"
      >
        {content}
      </motion.div>
    )
  }
)
SuccessCard.displayName = "SuccessCard"

// ===== Confetti Component =====

interface ConfettiPiece {
  id: number
  x: number
  color: string
  delay: number
  rotation: number
  scale: number
}

export interface ConfettiProps {
  /** Whether confetti is active */
  active: boolean
  /** Number of confetti pieces */
  count?: number
  /** Duration in ms */
  duration?: number
  /** Colors for confetti */
  colors?: string[]
  /** Callback when complete */
  onComplete?: () => void
}

const defaultColors = [
  "#10B981", // success green
  "#0D9488", // teal
  "#F97316", // coral
  "#FBBF24", // amber
  "#8B5CF6", // purple
  "#EC4899", // pink
]

const confettiPieceVariants: Variants = {
  hidden: {
    y: -20,
    opacity: 0,
    rotate: 0,
  },
  visible: (custom: { delay: number; rotation: number }) => ({
    y: [0, -100, 400],
    opacity: [1, 1, 0],
    rotate: [0, custom.rotation, custom.rotation * 2],
    transition: {
      duration: 2,
      delay: custom.delay,
      ease: "easeOut",
    },
  }),
}

export function Confetti({
  active,
  count = 50,
  duration = 2500,
  colors = defaultColors,
  onComplete,
}: ConfettiProps) {
  const [pieces, setPieces] = React.useState<ConfettiPiece[]>([])

  React.useEffect(() => {
    if (active && !prefersReducedMotion()) {
      // Generate confetti pieces
      const newPieces: ConfettiPiece[] = Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.3,
        rotation: (Math.random() - 0.5) * 720,
        scale: 0.5 + Math.random() * 0.5,
      }))
      setPieces(newPieces)

      // Clear after duration
      const timer = setTimeout(() => {
        setPieces([])
        onComplete?.()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [active, count, duration, colors, onComplete])

  if (prefersReducedMotion() || pieces.length === 0) {
    return null
  }

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-50"
      aria-hidden="true"
    >
      {pieces.map((piece) => (
        <motion.div
          key={piece.id}
          className="absolute top-0"
          style={{
            left: `${piece.x}%`,
            width: 10 * piece.scale,
            height: 10 * piece.scale,
            backgroundColor: piece.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "0",
          }}
          custom={{ delay: piece.delay, rotation: piece.rotation }}
          variants={confettiPieceVariants}
          initial="hidden"
          animate="visible"
        />
      ))}
    </div>
  )
}

// ===== useConfetti Hook =====

export interface UseConfettiOptions {
  /** Duration in ms */
  duration?: number
  /** Number of pieces */
  count?: number
  /** Custom colors */
  colors?: string[]
}

export interface UseConfettiReturn {
  /** Whether confetti is active */
  active: boolean
  /** Trigger confetti */
  fire: () => void
  /** Stop confetti */
  stop: () => void
  /** Confetti component to render */
  ConfettiComponent: React.ReactNode
}

export function useConfetti(options: UseConfettiOptions = {}): UseConfettiReturn {
  const { duration = 2500, count = 50, colors } = options
  const [active, setActive] = React.useState(false)

  const fire = React.useCallback(() => {
    if (!prefersReducedMotion()) {
      setActive(true)
    }
  }, [])

  const stop = React.useCallback(() => {
    setActive(false)
  }, [])

  const handleComplete = React.useCallback(() => {
    setActive(false)
  }, [])

  const ConfettiComponent = (
    <Confetti
      active={active}
      duration={duration}
      count={count}
      colors={colors}
      onComplete={handleComplete}
    />
  )

  return {
    active,
    fire,
    stop,
    ConfettiComponent,
  }
}

// ===== Success Milestone Helpers =====

const MILESTONE_STORAGE_KEYS = {
  firstAnalysis: "milestone_first_analysis_complete",
  onboarding: "milestone_onboarding_complete",
  perfectScore: "milestone_perfect_score",
} as const

/**
 * Check if a milestone has been achieved before
 */
export function hasMilestoneBeenAchieved(
  milestone: keyof typeof MILESTONE_STORAGE_KEYS
): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(MILESTONE_STORAGE_KEYS[milestone]) === "true"
}

/**
 * Mark a milestone as achieved
 */
export function markMilestoneAchieved(
  milestone: keyof typeof MILESTONE_STORAGE_KEYS
): void {
  if (typeof window === "undefined") return
  localStorage.setItem(MILESTONE_STORAGE_KEYS[milestone], "true")
}

/**
 * Clear all milestone achievements (for testing)
 */
export function clearMilestones(): void {
  if (typeof window === "undefined") return
  Object.values(MILESTONE_STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key)
  })
}

// ===== CSS Utility Classes =====

export const successClasses = {
  /** Base success background */
  bg: "bg-success/10",
  /** Success text color */
  text: "text-success",
  /** Success border */
  border: "border-success",
  /** Success ring */
  ring: "ring-success",
  /** Solid success background */
  bgSolid: "bg-success text-success-foreground",
}

// ===== Exports =====

export {
  SuccessIcon,
  SuccessMessage,
  SuccessBanner,
  SuccessCard,
  successMessageVariants,
}
