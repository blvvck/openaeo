import * as React from "react"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"



type CardVariant = "default" | "elevated" | "outline" | "filled" | "ghost";
type CardSize = "sm" | "default" | "lg";

const cardSurface: Record<CardVariant, string> = {
  default: "border border-transparent shadow-sm dark:border-border dark:shadow-none",
  elevated: "border border-transparent shadow-md dark:border-border dark:shadow-none",
  outline: "border border-border shadow-none",
  filled: "border-none bg-muted/50 shadow-none dark:bg-muted/30",
  ghost: "border-none bg-transparent shadow-none",
};

function cardVariants({
  variant = "default",
  size: _size = "default",
  interactive = false,
  className,
}: { variant?: CardVariant; size?: CardSize; interactive?: boolean; className?: string } = {}) {
  return cn(
    "rounded-xl bg-card text-card-foreground transition-all duration-200 ease-out motion-reduce:transition-none",
    cardSurface[variant],
    interactive && "cursor-pointer hover:-translate-y-0.5 hover:shadow-md dark:hover:border-ring/50 dark:hover:shadow-none active:translate-y-0 active:shadow-sm dark:active:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-none",
    className,
  );
}

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  size?: CardSize;
  interactive?: boolean;
  /** Show loading overlay with spinner */
  isLoading?: boolean
  /** Loading text to display */
  loadingText?: string
  /** Render as a different element (e.g., article, section) */
  as?: "div" | "article" | "section" | "aside"
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, interactive, isLoading, loadingText, as: Component = "div", children, ...props }, ref) => (
    <Component
      ref={ref}
      className={cn(cardVariants({ variant, size, interactive }), "relative", className)}
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? "button" : undefined}
      {...props}
    >
      {children}
      {isLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm rounded-xl z-10"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
            {loadingText && (
              <span className="text-sm text-muted-foreground">{loadingText}</span>
            )}
          </div>
        </div>
      )}
    </Component>
  )
)
Card.displayName = "Card"

// Size-aware padding map
const sizeMap = {
  sm: { header: "p-4", content: "p-4 pt-0", footer: "p-4 pt-0" },
  default: { header: "p-6", content: "p-6 pt-0", footer: "p-6 pt-0" },
  lg: { header: "p-8", content: "p-8 pt-0", footer: "p-8 pt-0" },
}

// Create context for size propagation
const CardContext = React.createContext<{ size?: "sm" | "default" | "lg" }>({ size: "default" })

const CardProvider = ({ size, children }: { size?: "sm" | "default" | "lg"; children: React.ReactNode }) => (
  <CardContext.Provider value={{ size }}>{children}</CardContext.Provider>
)

const useCardContext = () => React.useContext(CardContext)

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { size?: CardSize }>(
  function CardHeaderElement({ className, size: propSize, ...props }, ref) {
    const { size: contextSize } = useCardContext()
    const size = propSize || contextSize || "default"

    return (
      <div
        ref={ref}
        className={cn("flex flex-col space-y-1.5", sizeMap[size].header, className)}
        {...props}
      />
    )
  },
)

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement> & { as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" }>(
  function CardTitleElement({ className, as: Component = "h3", ...props }, ref) {
    return (
      <Component
        ref={ref}
        className={cn("text-lg font-semibold leading-none tracking-tight", className)}
        {...props}
      />
    )
  },
)

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  function CardDescriptionText({ className, ...props }, ref) {
    return <p ref={ref} className={cn("text-sm leading-relaxed text-muted-foreground", className)} {...props} />
  },
)

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { size?: CardSize }>(
  function CardContentRegion({ className, size: propSize, ...props }, ref) {
    const { size: contextSize } = useCardContext()
    const size = propSize || contextSize || "default"

    return (
      <div
        ref={ref}
        className={cn(sizeMap[size].content, className)}
        {...props}
      />
    )
  },
)

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { size?: CardSize }>(
  function CardFooterActions({ className, size: propSize, ...props }, ref) {
    const { size: contextSize } = useCardContext()
    const size = propSize || contextSize || "default"

    return (
      <div
        ref={ref}
        className={cn("flex items-center", sizeMap[size].footer, className)}
        {...props}
      />
    )
  },
)

/**
 * CardSkeleton Component
 *
 * Pre-built skeleton for common card loading states.
 */
interface CardSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show header skeleton */
  showHeader?: boolean
  /** Number of content lines */
  lines?: number
  /** Show footer skeleton */
  showFooter?: boolean
}

const CardSkeleton = React.forwardRef<HTMLDivElement, CardSkeletonProps>(
  ({ showHeader = true, lines = 3, showFooter = false, className, ...props }, ref) => (
    <Card ref={ref} className={cn("animate-pulse", className)} {...props}>
      {showHeader && (
        <CardHeader>
          <div className="h-5 w-1/3 bg-muted rounded" />
          <div className="h-4 w-2/3 bg-muted rounded" />
        </CardHeader>
      )}
      <CardContent>
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className="h-4 bg-muted rounded"
              style={{ width: `${Math.max(40, 100 - i * 15)}%` }}
            />
          ))}
        </div>
      </CardContent>
      {showFooter && (
        <CardFooter>
          <div className="h-9 w-24 bg-muted rounded" />
        </CardFooter>
      )}
    </Card>
  )
)
CardSkeleton.displayName = "CardSkeleton"

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  CardSkeleton,
  CardProvider,
  cardVariants,
}
