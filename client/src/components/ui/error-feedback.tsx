

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, AlertTriangle, XCircle, RefreshCw, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { DURATION, EASE, SPRING, prefersReducedMotion } from '@/lib/motion';

// ===== Constants =====
export const ERROR_VARIANTS = {
  inline: 'inline',
  toast: 'toast',
  banner: 'banner',
} as const;

export type ErrorVariant = keyof typeof ERROR_VARIANTS;

export const ERROR_SEVERITIES = {
  error: 'error',
  warning: 'warning',
  critical: 'critical',
} as const;

export type ErrorSeverity = keyof typeof ERROR_SEVERITIES;

// ===== Animation Variants =====
export const errorShake = {
  initial: { x: 0 },
  shake: {
    x: [0, -10, 10, -10, 10, -5, 5, 0],
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

export const errorFadeIn = {
  hidden: { opacity: 0, y: -8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.fast,
      ease: EASE.outExpo,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: DURATION.fast,
    },
  },
};

export const errorSlideIn = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: SPRING.snappy,
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: {
      duration: DURATION.fast,
    },
  },
};

export const bannerSlideDown = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: 'auto',
    transition: {
      duration: DURATION.normal,
      ease: EASE.outExpo,
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: {
      duration: DURATION.fast,
    },
  },
};

export const iconPulse = {
  initial: { scale: 1 },
  pulse: {
    scale: [1, 1.1, 1],
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

// ===== Error Message Styles =====
const errorMessageVariants = cva(
  'flex items-start gap-3 text-sm',
  {
    variants: {
      variant: {
        inline: 'text-destructive',
        toast: [
          'p-4 rounded-lg border shadow-lg bg-background',
          'border-destructive/50',
        ],
        banner: [
          'p-4 rounded-lg border w-full',
          'border-destructive/50 bg-destructive/10',
        ],
      },
      severity: {
        error: '',
        warning: '',
        critical: '',
      },
    },
    compoundVariants: [
      // Warning severity overrides
      { variant: 'inline', severity: 'warning', className: 'text-warning' },
      { variant: 'toast', severity: 'warning', className: 'border-warning/50' },
      { variant: 'banner', severity: 'warning', className: 'border-warning/50 bg-warning/10' },
      // Critical severity adds emphasis
      { variant: 'banner', severity: 'critical', className: 'border-destructive bg-destructive/20' },
    ],
    defaultVariants: {
      variant: 'inline',
      severity: 'error',
    },
  }
);

// ===== ErrorMessage Component =====
export interface ErrorMessageProps extends VariantProps<typeof errorMessageVariants> {
  /** Error message content */
  message: string;
  /** Additional details (expandable) */
  details?: string;
  /** Show icon */
  showIcon?: boolean;
  /** Dismiss callback */
  onDismiss?: () => void;
  /** Retry callback */
  onRetry?: () => void;
  /** Retry button text */
  retryText?: string;
  /** Whether retry is in progress */
  isRetrying?: boolean;
  /** Animate entrance */
  animate?: boolean;
  /** Additional class name */
  className?: string;
  /** Test ID */
  'data-testid'?: string;
}

/**
 * ErrorMessage displays error feedback with multiple variants.
 * Supports inline, toast, and banner display modes.
 */
export const ErrorMessage = React.forwardRef<HTMLDivElement, ErrorMessageProps>(
  (
    {
      message,
      details,
      variant = 'inline',
      severity = 'error',
      showIcon = true,
      onDismiss,
      onRetry,
      retryText = 'Retry',
      isRetrying = false,
      animate = true,
      className,
      'data-testid': testId,
    },
    ref
  ) => {
    const [showDetails, setShowDetails] = React.useState(false);
    const reducedMotion = prefersReducedMotion();
    const shouldAnimate = animate && !reducedMotion;

    const Icon = severity === 'critical' ? XCircle : severity === 'warning' ? AlertTriangle : AlertCircle;
    const iconColor = severity === 'warning' ? 'text-warning' : 'text-destructive';

    const content = (
      <div
        ref={ref}
        className={cn(errorMessageVariants({ variant, severity }), className)}
        role="alert"
        aria-live="assertive"
        data-testid={testId}
      >
        {showIcon && (
          <motion.span
            className={cn('flex-shrink-0 mt-0.5', iconColor)}
            variants={shouldAnimate ? iconPulse : undefined}
            initial="initial"
            animate="pulse"
            aria-hidden="true"
          >
            <Icon className="h-4 w-4" />
          </motion.span>
        )}

        <div className="flex-1 min-w-0">
          <p className={cn(
            'font-medium',
            severity === 'warning' ? 'text-warning' : 'text-destructive'
          )}>
            {message}
          </p>

          {details && (
            <>
              <button
                type="button"
                className="inline-flex items-center gap-1 mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowDetails(!showDetails)}
                aria-expanded={showDetails}
              >
                {showDetails ? 'Hide details' : 'Show details'}
                {showDetails ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>

              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={shouldAnimate ? { opacity: 0, height: 0 } : undefined}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={shouldAnimate ? { opacity: 0, height: 0 } : undefined}
                    className="overflow-hidden"
                  >
                    <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                      {details}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {onRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              isLoading={isRetrying}
              loadingText="Retrying..."
              className="h-7 px-2 text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              {retryText}
            </Button>
          )}

          {onDismiss && (
            <button
              type="button"
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={onDismiss}
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );

    // Apply animation wrapper based on variant
    if (!shouldAnimate) {
      return content;
    }

    const variants =
      variant === 'toast'
        ? errorSlideIn
        : variant === 'banner'
        ? bannerSlideDown
        : errorFadeIn;

    return (
      <motion.div
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={variants}
      >
        {content}
      </motion.div>
    );
  }
);
ErrorMessage.displayName = 'ErrorMessage';

// ===== FormError Component =====
export interface FormErrorProps {
  /** Error message */
  message?: string | null;
  /** Field ID for aria-describedby */
  fieldId?: string;
  /** Animate entrance */
  animate?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * FormError displays inline error messages for form fields.
 * Designed to work with form inputs via aria-describedby.
 */
export const FormError: React.FC<FormErrorProps> = ({
  message,
  fieldId,
  animate = true,
  className,
}) => {
  const reducedMotion = prefersReducedMotion();
  const shouldAnimate = animate && !reducedMotion;

  if (!message) return null;

  const content = (
    <p
      id={fieldId ? `${fieldId}-error` : undefined}
      className={cn(
        'text-sm text-destructive flex items-center gap-1.5 mt-1.5',
        className
      )}
      role="alert"
    >
      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );

  if (!shouldAnimate) {
    return content;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={errorFadeIn}
    >
      {content}
    </motion.div>
  );
};
FormError.displayName = 'FormError';

// ===== FormErrorList Component =====
export interface FormErrorListProps {
  /** Array of error messages */
  errors: string[];
  /** Title for the error list */
  title?: string;
  /** Additional class name */
  className?: string;
}

/**
 * FormErrorList displays multiple form errors in a list format.
 * Useful for form-level validation summary.
 */
export const FormErrorList: React.FC<FormErrorListProps> = ({
  errors,
  title = 'Please fix the following errors:',
  className,
}) => {
  if (errors.length === 0) return null;

  return (
    <div
      className={cn(
        'p-4 rounded-lg border border-destructive/50 bg-destructive/10',
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <p className="font-medium text-destructive mb-2">{title}</p>
      <ul className="list-disc list-inside space-y-1 text-sm text-destructive">
        {errors.map((error, index) => (
          <li key={index}>{error}</li>
        ))}
      </ul>
    </div>
  );
};
FormErrorList.displayName = 'FormErrorList';

// ===== ApiError Component =====
export interface ApiErrorDetails {
  /** HTTP status code */
  statusCode?: number;
  /** Error code (e.g., "RATE_LIMITED", "UNAUTHORIZED") */
  code?: string;
  /** Request ID for debugging */
  requestId?: string;
  /** Timestamp */
  timestamp?: string | Date;
}

export interface ApiErrorProps {
  /** Error title */
  title?: string;
  /** Error message */
  message: string;
  /** Error details */
  details?: ApiErrorDetails;
  /** Retry callback */
  onRetry?: () => void;
  /** Whether retry is in progress */
  isRetrying?: boolean;
  /** Show technical details (for developers) */
  showTechnicalDetails?: boolean;
  /** Dismiss callback */
  onDismiss?: () => void;
  /** Additional class name */
  className?: string;
}

/**
 * ApiError displays API errors with status codes and retry support.
 * Shows user-friendly messages with optional technical details.
 */
export const ApiError: React.FC<ApiErrorProps> = ({
  title = 'Something went wrong',
  message,
  details,
  onRetry,
  isRetrying = false,
  showTechnicalDetails = false,
  onDismiss,
  className,
}) => {
  const [showDetails, setShowDetails] = React.useState(false);
  const reducedMotion = prefersReducedMotion();

  // Format timestamp
  const formattedTimestamp = React.useMemo(() => {
    if (!details?.timestamp) return null;
    const date = typeof details.timestamp === 'string'
      ? new Date(details.timestamp)
      : details.timestamp;
    return date.toLocaleString();
  }, [details?.timestamp]);

  return (
    <motion.div
      className={cn(
        'p-4 rounded-lg border border-destructive/50 bg-destructive/10',
        className
      )}
      initial={reducedMotion ? undefined : 'hidden'}
      animate="visible"
      variants={errorFadeIn}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <motion.span
          className="flex-shrink-0 text-destructive mt-0.5"
          variants={reducedMotion ? undefined : iconPulse}
          initial="initial"
          animate="pulse"
        >
          <XCircle className="h-5 w-5" />
        </motion.span>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium text-destructive">{title}</h4>
              <p className="text-sm text-muted-foreground mt-1">{message}</p>
            </div>

            {onDismiss && (
              <button
                type="button"
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                onClick={onDismiss}
                aria-label="Dismiss error"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Technical details */}
          {showTechnicalDetails && details && (
            <>
              <button
                type="button"
                className="inline-flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowDetails(!showDetails)}
                aria-expanded={showDetails}
              >
                {showDetails ? 'Hide technical details' : 'Show technical details'}
                {showDetails ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>

              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={reducedMotion ? undefined : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={reducedMotion ? undefined : { opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <dl className="mt-2 text-xs space-y-1 text-muted-foreground">
                      {details.statusCode && (
                        <div className="flex gap-2">
                          <dt className="font-medium">Status:</dt>
                          <dd>{details.statusCode}</dd>
                        </div>
                      )}
                      {details.code && (
                        <div className="flex gap-2">
                          <dt className="font-medium">Code:</dt>
                          <dd className="font-mono">{details.code}</dd>
                        </div>
                      )}
                      {details.requestId && (
                        <div className="flex gap-2">
                          <dt className="font-medium">Request ID:</dt>
                          <dd className="font-mono text-xs">{details.requestId}</dd>
                        </div>
                      )}
                      {formattedTimestamp && (
                        <div className="flex gap-2">
                          <dt className="font-medium">Time:</dt>
                          <dd>{formattedTimestamp}</dd>
                        </div>
                      )}
                    </dl>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* Retry button */}
          {onRetry && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                isLoading={isRetrying}
                loadingText="Retrying..."
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try again
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
ApiError.displayName = 'ApiError';

// ===== ErrorBoundary Component =====
export interface ErrorBoundaryProps {
  /** Fallback UI to display on error */
  fallback?: React.ReactNode;
  /** Custom fallback render function */
  fallbackRender?: (props: {
    error: Error;
    resetErrorBoundary: () => void;
  }) => React.ReactNode;
  /** Callback when error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Callback when error boundary is reset */
  onReset?: () => void;
  /** Children to render */
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary catches JavaScript errors in child components
 * and displays a fallback UI instead of crashing.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  resetErrorBoundary = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Custom fallback render
      if (this.props.fallbackRender) {
        return this.props.fallbackRender({
          error: this.state.error,
          resetErrorBoundary: this.resetErrorBoundary,
        });
      }

      // Default fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Built-in fallback
      return (
        <ErrorBoundaryFallback
          error={this.state.error}
          resetErrorBoundary={this.resetErrorBoundary}
        />
      );
    }

    return this.props.children;
  }
}

// ===== ErrorBoundaryFallback Component =====
export interface ErrorBoundaryFallbackProps {
  /** The error that was caught */
  error: Error;
  /** Function to reset the error boundary */
  resetErrorBoundary: () => void;
  /** Additional class name */
  className?: string;
}

/**
 * Default fallback UI for ErrorBoundary.
 * Shows error message with reset option.
 */
export const ErrorBoundaryFallback: React.FC<ErrorBoundaryFallbackProps> = ({
  error,
  resetErrorBoundary,
  className,
}) => {
  const [showStack, setShowStack] = React.useState(false);

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-[200px] p-8 text-center',
        className
      )}
      role="alert"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={SPRING.gentle}
      >
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <XCircle className="h-8 w-8 text-destructive" />
        </div>
      </motion.div>

      <h3 className="text-lg font-semibold text-foreground mb-2">
        Something went wrong
      </h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-md">
        {error.message || 'An unexpected error occurred'}
      </p>

      {/* Stack trace toggle (development only) */}
      {process.env.NODE_ENV === 'development' && error.stack && (
        <>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground mb-4"
            onClick={() => setShowStack(!showStack)}
          >
            {showStack ? 'Hide stack trace' : 'Show stack trace'}
          </button>

          {showStack && (
            <pre className="text-left text-xs bg-muted p-4 rounded-md overflow-auto max-w-full max-h-48 mb-4">
              {error.stack}
            </pre>
          )}
        </>
      )}

      <Button onClick={resetErrorBoundary}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Try again
      </Button>
    </div>
  );
};
ErrorBoundaryFallback.displayName = 'ErrorBoundaryFallback';

// ===== ErrorIcon Component =====
export interface ErrorIconProps {
  /** Icon size */
  size?: 'sm' | 'md' | 'lg';
  /** Icon color variant */
  variant?: 'error' | 'warning';
  /** Animate on mount */
  animate?: boolean;
  /** Additional class name */
  className?: string;
}

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

/**
 * ErrorIcon displays an animated error icon.
 */
export const ErrorIcon: React.FC<ErrorIconProps> = ({
  size = 'md',
  variant = 'error',
  animate = true,
  className,
}) => {
  const reducedMotion = prefersReducedMotion();
  const shouldAnimate = animate && !reducedMotion;

  const Icon = variant === 'warning' ? AlertTriangle : AlertCircle;
  const colorClass = variant === 'warning' ? 'text-warning' : 'text-destructive';

  if (!shouldAnimate) {
    return <Icon className={cn(iconSizes[size], colorClass, className)} aria-hidden="true" />;
  }

  return (
    <motion.span
      className={cn(colorClass, className)}
      variants={iconPulse}
      initial="initial"
      animate="pulse"
      aria-hidden="true"
    >
      <Icon className={iconSizes[size]} />
    </motion.span>
  );
};
ErrorIcon.displayName = 'ErrorIcon';

// ===== ShakeContainer Component =====
export interface ShakeContainerProps {
  /** Whether to trigger shake animation */
  shake: boolean;
  /** Children to wrap */
  children: React.ReactNode;
  /** Callback when shake animation completes */
  onShakeComplete?: () => void;
  /** Additional class name */
  className?: string;
}

/**
 * ShakeContainer wraps content and applies shake animation on error.
 */
export const ShakeContainer: React.FC<ShakeContainerProps> = ({
  shake,
  children,
  onShakeComplete,
  className,
}) => {
  const reducedMotion = prefersReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={errorShake}
      initial="initial"
      animate={shake ? 'shake' : 'initial'}
      onAnimationComplete={() => {
        if (shake) {
          onShakeComplete?.();
        }
      }}
    >
      {children}
    </motion.div>
  );
};
ShakeContainer.displayName = 'ShakeContainer';

// ===== useErrorShake Hook =====
/**
 * Hook to manage shake animation state for error feedback.
 */
export function useErrorShake() {
  const [isShaking, setIsShaking] = React.useState(false);

  const triggerShake = React.useCallback(() => {
    setIsShaking(true);
  }, []);

  const onShakeComplete = React.useCallback(() => {
    setIsShaking(false);
  }, []);

  return {
    isShaking,
    triggerShake,
    onShakeComplete,
    shakeProps: {
      shake: isShaking,
      onShakeComplete,
    },
  };
}

// ===== useApiError Hook =====
export interface UseApiErrorOptions {
  /** Auto-dismiss after duration (ms) */
  autoDismissAfter?: number;
  /** Default error message */
  defaultMessage?: string;
}

/**
 * Hook to manage API error state with auto-dismiss and retry.
 */
export function useApiError(options: UseApiErrorOptions = {}) {
  const { autoDismissAfter, defaultMessage = 'An error occurred' } = options;

  const [error, setError] = React.useState<{
    message: string;
    details?: ApiErrorDetails;
  } | null>(null);

  const setApiError = React.useCallback(
    (message: string, details?: ApiErrorDetails) => {
      setError({ message, details });
    },
    []
  );

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback(
    (err: unknown) => {
      if (err instanceof Error) {
        setError({ message: err.message });
      } else if (typeof err === 'string') {
        setError({ message: err });
      } else {
        setError({ message: defaultMessage });
      }
    },
    [defaultMessage]
  );

  // Auto-dismiss
  React.useEffect(() => {
    if (error && autoDismissAfter) {
      const timeout = setTimeout(clearError, autoDismissAfter);
      return () => clearTimeout(timeout);
    }
  }, [error, autoDismissAfter, clearError]);

  return {
    error,
    setError: setApiError,
    clearError,
    handleError,
    hasError: error !== null,
  };
}

// ===== CSS Utility Classes =====
export const errorClasses = {
  // Text colors
  text: 'text-destructive',
  textWarning: 'text-warning',
  // Background colors
  bg: 'bg-destructive/10',
  bgWarning: 'bg-warning/10',
  // Border colors
  border: 'border-destructive/50',
  borderWarning: 'border-warning/50',
  // Ring colors (for focus states)
  ring: 'ring-destructive',
  ringWarning: 'ring-warning',
  // Combined error input state
  input: 'border-destructive focus-visible:ring-destructive placeholder:text-destructive/60',
  // Combined error container
  container: 'border border-destructive/50 bg-destructive/10 text-destructive',
} as const;

// ===== Re-exports =====
export { prefersReducedMotion } from '@/lib/motion';
