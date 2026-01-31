

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cva, type VariantProps } from "class-variance-authority"
import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type QueryKey,
} from "@tanstack/react-query"
import { Loader2, Check, X, Undo2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Card } from "./card"
import { Switch } from "./toggle-control"
import { DURATION, EASE, prefersReducedMotion } from "@/lib/motion"

// ===== Types =====

export interface OptimisticItem<T = unknown> {
  id: string | number
  data: T
  /** Whether this item has a pending mutation */
  isPending?: boolean
  /** Error message if mutation failed */
  error?: string | null
  /** Whether this is a new optimistic item (not yet confirmed) */
  isOptimistic?: boolean
}

export type OptimisticAction = "add" | "update" | "remove"

export interface OptimisticMutationContext<T> {
  /** Previous data before optimistic update */
  previousData: T | undefined
  /** The action being performed */
  action: OptimisticAction
  /** The item being mutated */
  item: OptimisticItem
}

// ===== useOptimisticMutation Hook =====

export interface UseOptimisticMutationOptions<
  TData,
  TError,
  TVariables,
  TContext extends OptimisticMutationContext<TData>
> extends Omit<
    UseMutationOptions<TData, TError, TVariables, TContext>,
    "onMutate" | "onError" | "onSettled"
  > {
  /** Query key to update optimistically */
  queryKey: QueryKey
  /** Function to compute optimistic update */
  optimisticUpdate: (
    oldData: TData | undefined,
    variables: TVariables
  ) => TData
  /** Function to extract item from variables for tracking */
  getItem: (variables: TVariables) => OptimisticItem
  /** Function to get the action type */
  getAction: (variables: TVariables) => OptimisticAction
  /** Callback when mutation starts */
  onMutateStart?: (variables: TVariables) => void
  /** Callback on error (after rollback) */
  onMutationError?: (error: TError, variables: TVariables, context: TContext | undefined) => void
  /** Callback on success */
  onMutationSuccess?: (data: TData, variables: TVariables) => void
  /** Callback when settled (success or error) */
  onMutationSettled?: () => void
}

export function useOptimisticMutation<
  TData,
  TError = Error,
  TVariables = void,
  TContext extends OptimisticMutationContext<TData> = OptimisticMutationContext<TData>
>(options: UseOptimisticMutationOptions<TData, TError, TVariables, TContext>) {
  const queryClient = useQueryClient()
  const {
    queryKey,
    optimisticUpdate,
    getItem,
    getAction,
    onMutateStart,
    onMutationError,
    onMutationSuccess,
    onMutationSettled,
    ...mutationOptions
  } = options

  // Track pending mutations
  const [pendingItems, setPendingItems] = React.useState<Set<string | number>>(
    new Set()
  )
  const [errorItems, setErrorItems] = React.useState<
    Map<string | number, string>
  >(new Map())

  const mutation = useMutation<TData, TError, TVariables, TContext>({
    ...mutationOptions,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey })

      // Get the item and action
      const item = getItem(variables)
      const action = getAction(variables)

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<TData>(queryKey)

      // Mark item as pending
      setPendingItems((prev) => new Set(prev).add(item.id))
      setErrorItems((prev) => {
        const next = new Map(prev)
        next.delete(item.id)
        return next
      })

      // Optimistically update
      queryClient.setQueryData<TData>(queryKey, (old) =>
        optimisticUpdate(old, variables)
      )

      // Call user callback
      onMutateStart?.(variables)

      // Return context with the previous data
      return { previousData, action, item } as TContext
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData)
      }

      // Set error state
      const item = getItem(variables)
      setErrorItems((prev) => {
        const next = new Map(prev)
        next.set(item.id, error instanceof Error ? error.message : String(error))
        return next
      })

      // Call user callback
      onMutationError?.(error, variables, context)
    },
    onSuccess: (data, variables) => {
      onMutationSuccess?.(data, variables)
    },
    onSettled: (_, __, variables) => {
      // Clear pending state
      const item = getItem(variables)
      setPendingItems((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })

      // Call user callback
      onMutationSettled?.()
    },
  })

  // Helper to check if an item is pending
  const isItemPending = React.useCallback(
    (id: string | number) => pendingItems.has(id),
    [pendingItems]
  )

  // Helper to get item error
  const getItemError = React.useCallback(
    (id: string | number) => errorItems.get(id),
    [errorItems]
  )

  // Helper to clear item error
  const clearItemError = React.useCallback((id: string | number) => {
    setErrorItems((prev) => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  return {
    ...mutation,
    pendingItems,
    errorItems,
    isItemPending,
    getItemError,
    clearItemError,
  }
}

// ===== OptimisticList Component =====

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, height: 0, y: -10 },
  visible: {
    opacity: 1,
    height: "auto",
    y: 0,
    transition: {
      duration: DURATION.normal,
      ease: EASE.outExpo,
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    y: -10,
    transition: {
      duration: DURATION.fast,
      ease: EASE.inExpo,
    },
  },
}

// Props that conflict with framer-motion
type MotionConflictingProps = 'onAnimationStart' | 'onDrag' | 'onDragEnd' | 'onDragStart' | 'onAnimationEnd'

export interface OptimisticListProps<T>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | MotionConflictingProps> {
  /** List items */
  items: OptimisticItem<T>[]
  /** Render function for each item */
  renderItem: (item: OptimisticItem<T>, index: number) => React.ReactNode
  /** Unique key extractor */
  keyExtractor?: (item: OptimisticItem<T>) => string | number
  /** Called when undo is clicked for an item */
  onUndo?: (item: OptimisticItem<T>) => void
  /** Called when error is dismissed */
  onDismissError?: (item: OptimisticItem<T>) => void
  /** Empty state message */
  emptyMessage?: string
  /** Empty state element */
  emptyElement?: React.ReactNode
  /** Whether to animate list changes */
  animate?: boolean
  /** Gap between items */
  gap?: "none" | "sm" | "md" | "lg"
  /** Show undo button for optimistic items */
  showUndo?: boolean
  /** Undo timeout in ms (auto-confirm after this) */
  undoTimeout?: number
}

const gapClasses = {
  none: "gap-0",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
}

function OptimisticListInner<T>(
  {
    items,
    renderItem,
    keyExtractor = (item) => item.id,
    onUndo,
    onDismissError,
    emptyMessage = "No items",
    emptyElement,
    animate = true,
    gap = "md",
    showUndo = true,
    undoTimeout,
    className,
    ...props
  }: OptimisticListProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const reducedMotion = prefersReducedMotion()
  const shouldAnimate = animate && !reducedMotion

  // Track undo timers
  const undoTimers = React.useRef<Map<string | number, NodeJS.Timeout>>(
    new Map()
  )

  // Clear timers on unmount
  React.useEffect(() => {
    return () => {
      undoTimers.current.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  // Set up undo timeout for optimistic items
  React.useEffect(() => {
    if (!undoTimeout) return

    items.forEach((item) => {
      if (item.isOptimistic && !undoTimers.current.has(item.id)) {
        const timer = setTimeout(() => {
          undoTimers.current.delete(item.id)
          // Item confirmed after timeout
        }, undoTimeout)
        undoTimers.current.set(item.id, timer)
      }
    })

    // Cleanup timers for items no longer in list
    undoTimers.current.forEach((_, id) => {
      if (!items.find((item) => item.id === id)) {
        const timer = undoTimers.current.get(id)
        if (timer) clearTimeout(timer)
        undoTimers.current.delete(id)
      }
    })
  }, [items, undoTimeout])

  const handleUndo = React.useCallback(
    (item: OptimisticItem<T>) => {
      const timer = undoTimers.current.get(item.id)
      if (timer) {
        clearTimeout(timer)
        undoTimers.current.delete(item.id)
      }
      onUndo?.(item)
    },
    [onUndo]
  )

  if (items.length === 0) {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center py-8 text-muted-foreground",
          className
        )}
        {...props}
      >
        {emptyElement || <p className="text-sm">{emptyMessage}</p>}
      </div>
    )
  }

  const content = items.map((item, index) => (
    <OptimisticItemWrapper
      key={keyExtractor(item)}
      item={item}
      onUndo={showUndo && item.isOptimistic ? () => handleUndo(item) : undefined}
      onDismissError={onDismissError ? () => onDismissError(item) : undefined}
      animate={shouldAnimate}
    >
      {renderItem(item, index)}
    </OptimisticItemWrapper>
  ))

  if (shouldAnimate) {
    return (
      <motion.div
        ref={ref}
        variants={listVariants}
        initial="hidden"
        animate="visible"
        className={cn("flex flex-col", gapClasses[gap], className)}
        role="list"
        {...props}
      >
        <AnimatePresence mode="popLayout">{content}</AnimatePresence>
      </motion.div>
    )
  }

  return (
    <div
      ref={ref}
      className={cn("flex flex-col", gapClasses[gap], className)}
      role="list"
      {...props}
    >
      {content}
    </div>
  )
}

export const OptimisticList = React.forwardRef(OptimisticListInner) as <T>(
  props: OptimisticListProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => React.ReactElement

// ===== OptimisticItemWrapper Component =====

interface OptimisticItemWrapperProps<T> {
  item: OptimisticItem<T>
  children: React.ReactNode
  onUndo?: () => void
  onDismissError?: () => void
  animate?: boolean
}

function OptimisticItemWrapper<T>({
  item,
  children,
  onUndo,
  onDismissError,
  animate,
}: OptimisticItemWrapperProps<T>) {
  const Wrapper = animate ? motion.div : "div"
  const wrapperProps = animate
    ? {
        variants: itemVariants,
        initial: "hidden",
        animate: "visible",
        exit: "exit",
        layout: true,
      }
    : {}

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        "relative",
        item.isPending && "opacity-70",
        item.error && "border-destructive"
      )}
      role="listitem"
      aria-busy={item.isPending || undefined}
    >
      {/* Pending indicator */}
      {item.isPending && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-md z-10"
          aria-label="Saving changes"
        >
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}

      {/* Error state */}
      {item.error && (
        <div
          className="mb-2 p-2 rounded-md bg-destructive/10 border border-destructive text-destructive flex items-center justify-between text-sm"
          role="alert"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{item.error}</span>
          </div>
          {onDismissError && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onDismissError}
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      {/* Main content */}
      <div className={cn(item.isOptimistic && "border-l-2 border-primary pl-3")}>
        {children}
      </div>

      {/* Undo button */}
      {onUndo && !item.isPending && !item.error && (
        <div className="absolute top-2 right-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onUndo}
            className="gap-1 h-7 text-xs"
            aria-label="Undo action"
          >
            <Undo2 className="w-3 h-3" />
            Undo
          </Button>
        </div>
      )}
    </Wrapper>
  )
}

// ===== OptimisticToggle Component =====

const toggleVariants = cva(
  "relative inline-flex items-center gap-2",
  {
    variants: {
      size: {
        sm: "text-sm",
        md: "text-base",
        lg: "text-lg",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

export interface OptimisticToggleProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange">,
    VariantProps<typeof toggleVariants> {
  /** Current checked state */
  checked: boolean
  /** Called when toggle is clicked (should trigger mutation) */
  onCheckedChange: (checked: boolean) => void
  /** Whether the toggle is in a pending state */
  isPending?: boolean
  /** Error message if toggle failed */
  error?: string | null
  /** Called when error is dismissed */
  onDismissError?: () => void
  /** Label for the toggle */
  label?: string
  /** Description text */
  description?: string
  /** Whether the toggle is disabled */
  disabled?: boolean
  /** Show loading indicator */
  showLoadingIndicator?: boolean
  /** Show success indicator after change */
  showSuccessIndicator?: boolean
  /** Success indicator duration in ms */
  successDuration?: number
}

const OptimisticToggle = React.forwardRef<HTMLDivElement, OptimisticToggleProps>(
  (
    {
      checked,
      onCheckedChange,
      isPending = false,
      error,
      onDismissError,
      label,
      description,
      disabled = false,
      showLoadingIndicator = true,
      showSuccessIndicator = true,
      successDuration = 1500,
      size,
      className,
      ...props
    },
    ref
  ) => {
    const [showSuccess, setShowSuccess] = React.useState(false)
    const [optimisticChecked, setOptimisticChecked] = React.useState(checked)
    const reducedMotion = prefersReducedMotion()

    // Sync optimistic state with actual state when not pending
    React.useEffect(() => {
      if (!isPending) {
        setOptimisticChecked(checked)
      }
    }, [checked, isPending])

    // Handle success indicator
    const prevCheckedRef = React.useRef(checked)
    React.useEffect(() => {
      if (
        showSuccessIndicator &&
        !isPending &&
        !error &&
        prevCheckedRef.current !== checked
      ) {
        setShowSuccess(true)
        const timer = setTimeout(() => setShowSuccess(false), successDuration)
        prevCheckedRef.current = checked
        return () => clearTimeout(timer)
      }
      prevCheckedRef.current = checked
    }, [checked, isPending, error, showSuccessIndicator, successDuration])

    const handleChange = (newChecked: boolean) => {
      // Optimistically update the UI
      setOptimisticChecked(newChecked)
      onCheckedChange(newChecked)
    }

    return (
      <div
        ref={ref}
        className={cn(toggleVariants({ size }), className)}
        {...props}
      >
        <div className="relative">
          <Switch
            checked={optimisticChecked}
            onCheckedChange={handleChange}
            disabled={disabled || isPending}
            aria-busy={isPending || undefined}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? "toggle-error" : undefined}
          />

          {/* Loading indicator */}
          <AnimatePresence>
            {isPending && showLoadingIndicator && (
              <motion.div
                initial={reducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                transition={{ duration: DURATION.fast }}
                className="absolute -right-6 top-1/2 -translate-y-1/2"
                aria-label="Saving"
              >
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success indicator */}
          <AnimatePresence>
            {showSuccess && !isPending && !error && (
              <motion.div
                initial={reducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                transition={{ duration: DURATION.fast }}
                className="absolute -right-6 top-1/2 -translate-y-1/2"
                aria-label="Saved"
              >
                <Check className="w-4 h-4 text-green-500" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Label and description */}
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <span className={cn("font-medium", disabled && "opacity-50")}>
                {label}
              </span>
            )}
            {description && (
              <span className="text-sm text-muted-foreground">{description}</span>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            id="toggle-error"
            className="flex items-center gap-2 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
            {onDismissError && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onDismissError}
                aria-label="Dismiss error"
                className="h-5 w-5"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }
)
OptimisticToggle.displayName = "OptimisticToggle"

// ===== OptimisticCard Component =====

export interface OptimisticCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Card content */
  children: React.ReactNode
  /** Whether the card has a pending mutation */
  isPending?: boolean
  /** Error message */
  error?: string | null
  /** Called when error is dismissed */
  onDismissError?: () => void
  /** Whether this is an optimistic (unconfirmed) card */
  isOptimistic?: boolean
  /** Called when undo is clicked */
  onUndo?: () => void
  /** Show undo button */
  showUndo?: boolean
}

const OptimisticCard = React.forwardRef<HTMLDivElement, OptimisticCardProps>(
  (
    {
      children,
      isPending = false,
      error,
      onDismissError,
      isOptimistic = false,
      onUndo,
      showUndo = true,
      className,
      ...props
    },
    ref
  ) => {
    const reducedMotion = prefersReducedMotion()

    return (
      <Card
        ref={ref}
        className={cn(
          "relative overflow-hidden transition-all",
          isPending && "opacity-70",
          error && "border-destructive",
          isOptimistic && "border-l-4 border-l-primary",
          className
        )}
        aria-busy={isPending || undefined}
        {...props}
      >
        {/* Pending overlay */}
        <AnimatePresence>
          {isPending && (
            <motion.div
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0 }}
              transition={{ duration: DURATION.fast }}
              className="absolute inset-0 flex items-center justify-center bg-background/50 z-10"
              role="status"
              aria-label="Saving changes"
            >
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error banner */}
        {error && (
          <div
            className="p-3 bg-destructive/10 border-b border-destructive flex items-center justify-between"
            role="alert"
          >
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
            {onDismissError && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onDismissError}
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}

        {/* Main content */}
        {children}

        {/* Undo button for optimistic cards */}
        {isOptimistic && showUndo && onUndo && !isPending && !error && (
          <div className="absolute top-2 right-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onUndo}
              className="gap-1 h-7 text-xs"
              aria-label="Undo action"
            >
              <Undo2 className="w-3 h-3" />
              Undo
            </Button>
          </div>
        )}
      </Card>
    )
  }
)
OptimisticCard.displayName = "OptimisticCard"

// ===== useOptimisticToggle Hook =====

export interface UseOptimisticToggleOptions<TData, TError> {
  /** Query key to update */
  queryKey: QueryKey
  /** Mutation function */
  mutationFn: (checked: boolean) => Promise<TData>
  /** Extract checked state from query data */
  getChecked: (data: TData | undefined) => boolean
  /** Update query data with new checked state */
  updateData: (data: TData | undefined, checked: boolean) => TData
  /** Callback on success */
  onSuccess?: (data: TData) => void
  /** Callback on error */
  onError?: (error: TError) => void
}

export function useOptimisticToggle<TData, TError = Error>({
  queryKey,
  mutationFn,
  getChecked,
  updateData,
  onSuccess,
  onError,
}: UseOptimisticToggleOptions<TData, TError>) {
  const queryClient = useQueryClient()
  const [error, setError] = React.useState<string | null>(null)

  const mutation = useMutation<
    TData,
    TError,
    boolean,
    { previousData: TData | undefined }
  >({
    mutationFn,
    onMutate: async (newChecked) => {
      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData<TData>(queryKey)
      queryClient.setQueryData<TData>(queryKey, (old) =>
        updateData(old, newChecked)
      )
      setError(null)
      return { previousData }
    },
    onError: (err, _, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      setError(err instanceof Error ? err.message : String(err))
      onError?.(err)
    },
    onSuccess: (data) => {
      onSuccess?.(data)
    },
  })

  const clearError = React.useCallback(() => setError(null), [])

  return {
    checked: getChecked(queryClient.getQueryData<TData>(queryKey)),
    toggle: (checked: boolean) => mutation.mutate(checked),
    isPending: mutation.isPending,
    error,
    clearError,
  }
}

// ===== CSS Utility Classes =====

export const optimisticClasses = {
  /** Pending item opacity */
  pending: "opacity-70 pointer-events-none",
  /** Optimistic item border */
  optimistic: "border-l-4 border-l-primary",
  /** Error border */
  error: "border-destructive",
  /** Success animation */
  success: "animate-pulse bg-green-50 dark:bg-green-950/20",
  /** Undo button position */
  undoPosition: "absolute top-2 right-2",
  /** Overlay styles */
  overlay: "absolute inset-0 flex items-center justify-center bg-background/50 z-10",
}

// ===== Animation Variants =====

export const optimisticAnimationVariants = {
  /** Item enter animation */
  itemEnter: {
    initial: { opacity: 0, height: 0, y: -10 },
    animate: { opacity: 1, height: "auto", y: 0 },
    exit: { opacity: 0, height: 0, y: -10 },
  },
  /** Fade animation */
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  /** Scale animation for indicators */
  indicator: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
  },
}

// ===== Exports =====

export {
  OptimisticToggle,
  OptimisticCard,
  toggleVariants,
}
