import * as React from "react"

import { cn } from "@/lib/utils"



type InputSize = "sm" | "default" | "lg";
type InputVariant = "default" | "error";

const inputSizeStyles: Record<InputSize, string> = {
  sm: "h-9 px-2.5 text-sm",
  default: "h-10",
  lg: "h-12 px-4 text-base",
};

const inputVariantStyles: Record<InputVariant, string> = {
  default: "border-input",
  error: "border-destructive focus-visible:ring-destructive placeholder:text-destructive/60",
};

type InputVariantOptions = { size?: InputSize; variant?: InputVariant; hasCounter?: boolean; className?: string };

function inputVariants({ size = "default", variant = "default", hasCounter = false, className }: InputVariantOptions = {}) {
  return cn(
    "flex w-full rounded-md border bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-figma-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200 autofill:bg-background autofill:text-foreground [&:-webkit-autofill]:bg-background [&:-webkit-autofill]:text-foreground [&:-webkit-autofill]:shadow-[0_0_0px_1000px_hsl(var(--background))_inset] [&:-webkit-autofill]:[--webkit-text-fill-color:hsl(var(--foreground))] md:text-sm",
    inputSizeStyles[size],
    inputVariantStyles[variant],
    hasCounter && "pr-16",
    className,
  );
}

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Input size variant */
  size?: "sm" | "default" | "lg"
  variant?: InputVariant
  /** Show error state */
  error?: boolean
  /** Error message to display */
  errorMessage?: string
  /** Maximum character count (enables counter) */
  maxLength?: number
  /** Show character counter (requires maxLength) */
  showCounter?: boolean
  /** Wrapper className for the container */
  wrapperClassName?: string
  /** Left addon (icon or text) */
  leftAddon?: React.ReactNode
  /** Right addon (icon or text) */
  rightAddon?: React.ReactNode
  /** Shake animation on error */
  shake?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      size = "default",
      variant,
      error,
      errorMessage,
      maxLength,
      showCounter = false,
      wrapperClassName,
      leftAddon,
      rightAddon,
      shake = false,
      value,
      defaultValue,
      onChange,
      ...props
    },
    ref
  ) => {
    // Track character count
    const [charCount, setCharCount] = React.useState(() => {
      const initial = value?.toString() || defaultValue?.toString() || ""
      return initial.length
    })

    // Update char count on change
    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setCharCount(e.target.value.length)
        onChange?.(e)
      },
      [onChange]
    )

    // Sync charCount with controlled value
    React.useEffect(() => {
      if (value !== undefined) {
        setCharCount(value.toString().length)
      }
    }, [value])

    // Determine input variant
    const inputVariant = error ? "error" : variant
    const hasCounter = Boolean(showCounter && maxLength)

    // Determine inputMode based on type
    const inputMode = React.useMemo(() => {
      if (props.inputMode) return props.inputMode
      switch (type) {
        case "email":
          return "email"
        case "tel":
          return "tel"
        case "url":
          return "url"
        case "number":
          return "numeric"
        case "search":
          return "search"
        default:
          return undefined
      }
    }, [type, props.inputMode])

    const input = (
      <input
        type={type}
        className={cn(
          inputVariants({ size, variant: inputVariant, hasCounter }),
          leftAddon && "pl-10",
          rightAddon && !hasCounter && "pr-10",
          shake && "animate-shake",
          className
        )}
        ref={ref}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        maxLength={maxLength}
        inputMode={inputMode}
        aria-invalid={error || undefined}
        aria-describedby={
          error && errorMessage
            ? `${props.id}-error`
            : hasCounter
            ? `${props.id}-counter`
            : undefined
        }
        {...props}
      />
    )

    // Simple input without wrapper
    if (!leftAddon && !rightAddon && !hasCounter && !errorMessage) {
      return input
    }

    // Input with wrapper for addons, counter, error message
    return (
      <div className={cn("relative w-full", wrapperClassName)}>
        {/* Left addon */}
        {leftAddon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {leftAddon}
          </div>
        )}

        {input}

        {/* Right addon or counter */}
        {(rightAddon || hasCounter) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {hasCounter && (
              <span
                id={props.id ? `${props.id}-counter` : undefined}
                className={cn(
                  "text-xs tabular-nums",
                  charCount > (maxLength || 0)
                    ? "text-destructive font-medium"
                    : charCount > (maxLength || 0) * 0.9
                    ? "text-warning"
                    : "text-muted-foreground"
                )}
                aria-live="polite"
              >
                {charCount}/{maxLength}
              </span>
            )}
            {rightAddon && (
              <span className="text-muted-foreground">{rightAddon}</span>
            )}
          </div>
        )}

        {/* Error message */}
        {error && errorMessage && (
          <p
            id={props.id ? `${props.id}-error` : undefined}
            className="mt-1.5 text-sm text-destructive"
            role="alert"
          >
            {errorMessage}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
