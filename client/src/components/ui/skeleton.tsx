import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import { prefersReducedMotion } from "@/lib/motion"

// ===== Base Skeleton Component =====
const skeletonVariants = cva(
  "bg-muted",
  {
    variants: {
      variant: {
        default: "rounded-md",
        text: "rounded h-4",
        circular: "rounded-full",
        rectangular: "rounded-none",
        card: "rounded-lg",
      },
      animation: {
        pulse: "animate-pulse",
        shimmer: "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
        none: "",
      },
    },
    defaultVariants: {
      variant: "default",
      animation: "pulse",
    },
  }
)

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  /** Width of the skeleton (CSS value or number in pixels) */
  width?: string | number
  /** Height of the skeleton (CSS value or number in pixels) */
  height?: string | number
  /** Accessible label for screen readers */
  "aria-label"?: string
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      className,
      variant,
      animation,
      width,
      height,
      style,
      "aria-label": ariaLabel = "Loading...",
      ...props
    },
    ref
  ) => {
    // Respect reduced motion preference
    const reducedMotion = prefersReducedMotion()
    const safeAnimation = reducedMotion ? "none" : animation

    const computedStyle: React.CSSProperties = {
      ...style,
      width: typeof width === "number" ? `${width}px` : width,
      height: typeof height === "number" ? `${height}px` : height,
    }

    return (
      <div
        ref={ref}
        role="status"
        aria-busy="true"
        aria-label={ariaLabel}
        className={cn(skeletonVariants({ variant, animation: safeAnimation }), className)}
        style={computedStyle}
        {...props}
      />
    )
  }
)
Skeleton.displayName = "Skeleton"

// ===== Skeleton Text Component =====
export interface SkeletonTextProps extends Omit<SkeletonProps, "variant" | "height"> {
  /** Number of text lines to render */
  lines?: number
  /** Gap between lines in pixels */
  gap?: number
  /** Make the last line shorter */
  lastLineWidth?: string | number
  /** Height of each line */
  lineHeight?: string | number
}

const SkeletonText = React.forwardRef<HTMLDivElement, SkeletonTextProps>(
  (
    {
      lines = 3,
      gap = 8,
      lastLineWidth = "60%",
      lineHeight = 16,
      width = "100%",
      className,
      "aria-label": ariaLabel = "Loading text...",
      animation,
      ...props
    },
    ref
  ) => {
    const reducedMotion = prefersReducedMotion()
    const safeAnimation = reducedMotion ? "none" : animation

    return (
      <div
        ref={ref}
        role="status"
        aria-busy="true"
        aria-label={ariaLabel}
        className={cn("flex flex-col", className)}
        style={{ gap: `${gap}px` }}
        {...props}
      >
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            variant="text"
            animation={safeAnimation}
            width={i === lines - 1 && lines > 1 ? lastLineWidth : width}
            height={lineHeight}
            aria-hidden="true"
          />
        ))}
      </div>
    )
  }
)
SkeletonText.displayName = "SkeletonText"

// ===== Skeleton Avatar Component =====
export interface SkeletonAvatarProps extends Omit<SkeletonProps, "variant" | "width" | "height"> {
  /** Size of the avatar in pixels */
  size?: number | "sm" | "md" | "lg" | "xl"
}

const avatarSizes = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
}

const SkeletonAvatar = React.forwardRef<HTMLDivElement, SkeletonAvatarProps>(
  (
    {
      size = "md",
      className,
      "aria-label": ariaLabel = "Loading avatar...",
      animation,
      ...props
    },
    ref
  ) => {
    const sizeValue = typeof size === "number" ? size : avatarSizes[size]

    return (
      <Skeleton
        ref={ref}
        variant="circular"
        animation={animation}
        width={sizeValue}
        height={sizeValue}
        aria-label={ariaLabel}
        className={className}
        {...props}
      />
    )
  }
)
SkeletonAvatar.displayName = "SkeletonAvatar"

// ===== Skeleton Card Component =====
export interface SkeletonCardProps extends Omit<SkeletonProps, "variant"> {
  /** Show header section */
  showHeader?: boolean
  /** Show image placeholder at top */
  showImage?: boolean
  /** Image height */
  imageHeight?: number
  /** Number of text lines in body */
  bodyLines?: number
  /** Show footer section */
  showFooter?: boolean
}

const SkeletonCard = React.forwardRef<HTMLDivElement, SkeletonCardProps>(
  (
    {
      showHeader = true,
      showImage = false,
      imageHeight = 200,
      bodyLines = 3,
      showFooter = false,
      className,
      "aria-label": ariaLabel = "Loading card...",
      animation,
      width = "100%",
      ...props
    },
    ref
  ) => {
    const reducedMotion = prefersReducedMotion()
    const safeAnimation = reducedMotion ? "none" : animation

    return (
      <div
        ref={ref}
        role="status"
        aria-busy="true"
        aria-label={ariaLabel}
        className={cn(
          "rounded-lg border bg-card p-4",
          className
        )}
        style={{ width: typeof width === "number" ? `${width}px` : width }}
        {...props}
      >
        {/* Image placeholder */}
        {showImage && (
          <Skeleton
            variant="rectangular"
            animation={safeAnimation}
            width="100%"
            height={imageHeight}
            className="mb-4 rounded-md"
            aria-hidden="true"
          />
        )}

        {/* Header with avatar and title */}
        {showHeader && (
          <div className="flex items-center gap-3 mb-4">
            <SkeletonAvatar size="md" animation={safeAnimation} aria-hidden="true" />
            <div className="flex-1 space-y-2">
              <Skeleton
                variant="text"
                animation={safeAnimation}
                width="50%"
                height={16}
                aria-hidden="true"
              />
              <Skeleton
                variant="text"
                animation={safeAnimation}
                width="30%"
                height={12}
                aria-hidden="true"
              />
            </div>
          </div>
        )}

        {/* Body text lines */}
        <SkeletonText
          lines={bodyLines}
          animation={safeAnimation}
          aria-hidden="true"
        />

        {/* Footer actions */}
        {showFooter && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t">
            <Skeleton
              variant="default"
              animation={safeAnimation}
              width={80}
              height={32}
              aria-hidden="true"
            />
            <Skeleton
              variant="default"
              animation={safeAnimation}
              width={80}
              height={32}
              aria-hidden="true"
            />
          </div>
        )}
      </div>
    )
  }
)
SkeletonCard.displayName = "SkeletonCard"

// ===== Skeleton Table Component =====
export interface SkeletonTableProps extends Omit<SkeletonProps, "variant"> {
  /** Number of rows */
  rows?: number
  /** Number of columns */
  columns?: number
  /** Show header row */
  showHeader?: boolean
  /** Row height */
  rowHeight?: number
}

const SkeletonTable = React.forwardRef<HTMLDivElement, SkeletonTableProps>(
  (
    {
      rows = 5,
      columns = 4,
      showHeader = true,
      rowHeight = 48,
      className,
      "aria-label": ariaLabel = "Loading table...",
      animation,
      ...props
    },
    ref
  ) => {
    const reducedMotion = prefersReducedMotion()
    const safeAnimation = reducedMotion ? "none" : animation

    return (
      <div
        ref={ref}
        role="status"
        aria-busy="true"
        aria-label={ariaLabel}
        className={cn("w-full border rounded-lg overflow-hidden", className)}
        {...props}
      >
        {/* Header row */}
        {showHeader && (
          <div
            className="flex items-center gap-4 px-4 bg-muted/50 border-b"
            style={{ height: rowHeight }}
          >
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton
                key={`header-${i}`}
                variant="text"
                animation={safeAnimation}
                width={`${Math.random() * 30 + 50}%`}
                height={14}
                className="flex-1"
                aria-hidden="true"
              />
            ))}
          </div>
        )}

        {/* Body rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className={cn(
              "flex items-center gap-4 px-4",
              rowIndex < rows - 1 && "border-b"
            )}
            style={{ height: rowHeight }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${colIndex}`}
                variant="text"
                animation={safeAnimation}
                width={`${Math.random() * 40 + 40}%`}
                height={12}
                className="flex-1"
                aria-hidden="true"
              />
            ))}
          </div>
        ))}
      </div>
    )
  }
)
SkeletonTable.displayName = "SkeletonTable"

// ===== Skeleton List Component =====
export interface SkeletonListProps extends Omit<SkeletonProps, "variant"> {
  /** Number of list items */
  items?: number
  /** Show avatar for each item */
  showAvatar?: boolean
  /** Gap between items */
  gap?: number
}

const SkeletonList = React.forwardRef<HTMLDivElement, SkeletonListProps>(
  (
    {
      items = 5,
      showAvatar = true,
      gap = 16,
      className,
      "aria-label": ariaLabel = "Loading list...",
      animation,
      ...props
    },
    ref
  ) => {
    const reducedMotion = prefersReducedMotion()
    const safeAnimation = reducedMotion ? "none" : animation

    return (
      <div
        ref={ref}
        role="status"
        aria-busy="true"
        aria-label={ariaLabel}
        className={cn("flex flex-col", className)}
        style={{ gap: `${gap}px` }}
        {...props}
      >
        {Array.from({ length: items }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            {showAvatar && (
              <SkeletonAvatar size="md" animation={safeAnimation} aria-hidden="true" />
            )}
            <div className="flex-1 space-y-2">
              <Skeleton
                variant="text"
                animation={safeAnimation}
                width={`${Math.random() * 30 + 50}%`}
                height={14}
                aria-hidden="true"
              />
              <Skeleton
                variant="text"
                animation={safeAnimation}
                width={`${Math.random() * 20 + 30}%`}
                height={12}
                aria-hidden="true"
              />
            </div>
          </div>
        ))}
      </div>
    )
  }
)
SkeletonList.displayName = "SkeletonList"

// ===== Skeleton Button Component =====
export interface SkeletonButtonProps extends Omit<SkeletonProps, "variant"> {
  /** Button size */
  size?: "sm" | "md" | "lg"
}

const buttonSizes = {
  sm: { width: 60, height: 32 },
  md: { width: 80, height: 36 },
  lg: { width: 100, height: 40 },
}

const SkeletonButton = React.forwardRef<HTMLDivElement, SkeletonButtonProps>(
  (
    {
      size = "md",
      className,
      "aria-label": ariaLabel = "Loading button...",
      animation,
      ...props
    },
    ref
  ) => {
    const dimensions = buttonSizes[size]

    return (
      <Skeleton
        ref={ref}
        variant="default"
        animation={animation}
        width={dimensions.width}
        height={dimensions.height}
        aria-label={ariaLabel}
        className={className}
        {...props}
      />
    )
  }
)
SkeletonButton.displayName = "SkeletonButton"

// ===== Skeleton Input Component =====
export interface SkeletonInputProps extends Omit<SkeletonProps, "variant" | "height"> {
  /** Input size */
  size?: "sm" | "md" | "lg"
  /** Show label above input */
  showLabel?: boolean
}

const inputSizes = {
  sm: 32,
  md: 40,
  lg: 48,
}

const SkeletonInput = React.forwardRef<HTMLDivElement, SkeletonInputProps>(
  (
    {
      size = "md",
      showLabel = false,
      width = "100%",
      className,
      "aria-label": ariaLabel = "Loading input...",
      animation,
      ...props
    },
    ref
  ) => {
    const reducedMotion = prefersReducedMotion()
    const safeAnimation = reducedMotion ? "none" : animation
    const height = inputSizes[size]

    return (
      <div
        ref={ref}
        role="status"
        aria-busy="true"
        aria-label={ariaLabel}
        className={cn("flex flex-col gap-2", className)}
        {...props}
      >
        {showLabel && (
          <Skeleton
            variant="text"
            animation={safeAnimation}
            width={80}
            height={14}
            aria-hidden="true"
          />
        )}
        <Skeleton
          variant="default"
          animation={safeAnimation}
          width={width}
          height={height}
          aria-hidden="true"
        />
      </div>
    )
  }
)
SkeletonInput.displayName = "SkeletonInput"

export {
  Skeleton,
  skeletonVariants,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonTable,
  SkeletonList,
  SkeletonButton,
  SkeletonInput,
}
