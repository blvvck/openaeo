

// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import {
  ErrorMessage,
  FormError,
  FormErrorList,
  ApiError,
  ErrorBoundary,
  ErrorBoundaryFallback,
  ErrorIcon,
  ShakeContainer,
  useErrorShake,
  useApiError,
  errorShake,
  errorFadeIn,
  errorSlideIn,
  bannerSlideDown,
  iconPulse,
  errorClasses,
  ERROR_VARIANTS,
  ERROR_SEVERITIES,
} from './error-feedback';

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    motion: {
      div: React.forwardRef(({ children, variants, initial, animate, exit, onAnimationComplete, ...props }: any, ref: any) => {
        React.useEffect(() => {
          if (animate === 'shake' && onAnimationComplete) {
            const timer = setTimeout(onAnimationComplete, 100);
            return () => clearTimeout(timer);
          }
        }, [animate, onAnimationComplete]);
        return <div ref={ref} data-variants={variants ? 'true' : undefined} data-animate={animate} {...props}>{children}</div>;
      }),
      span: React.forwardRef(({ children, ...props }: any, ref: any) => (
        <span ref={ref} {...props}>{children}</span>
      )),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

// Mock prefersReducedMotion
vi.mock('@/lib/motion', async () => {
  const actual = await vi.importActual('@/lib/motion');
  return {
    ...actual,
    prefersReducedMotion: vi.fn(() => false),
  };
});

describe('ErrorMessage', () => {
  describe('rendering', () => {
    it('renders inline variant correctly', () => {
      render(<ErrorMessage message="Error occurred" variant="inline" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Error occurred');
      expect(screen.getByRole('alert')).toHaveClass('text-destructive');
    });

    it('renders toast variant correctly', () => {
      render(<ErrorMessage message="Error occurred" variant="toast" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Error occurred');
      expect(screen.getByRole('alert')).toHaveClass('rounded-lg', 'border', 'shadow-lg');
    });

    it('renders banner variant correctly', () => {
      render(<ErrorMessage message="Error occurred" variant="banner" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Error occurred');
      expect(screen.getByRole('alert')).toHaveClass('w-full');
    });

    it('shows icon by default', () => {
      render(<ErrorMessage message="Error" />);
      expect(screen.getByRole('alert').querySelector('svg')).toBeInTheDocument();
    });

    it('hides icon when showIcon is false', () => {
      render(<ErrorMessage message="Error" showIcon={false} />);
      expect(screen.getByRole('alert').querySelector('svg')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<ErrorMessage message="Error" className="custom-class" />);
      expect(screen.getByRole('alert')).toHaveClass('custom-class');
    });

    it('supports data-testid', () => {
      render(<ErrorMessage message="Error" data-testid="error-msg" />);
      expect(screen.getByTestId('error-msg')).toBeInTheDocument();
    });
  });

  describe('severity', () => {
    it('renders error severity with destructive color', () => {
      render(<ErrorMessage message="Error" severity="error" />);
      expect(screen.getByRole('alert').querySelector('p')).toHaveClass('text-destructive');
    });

    it('renders warning severity with warning color', () => {
      render(<ErrorMessage message="Warning" severity="warning" />);
      expect(screen.getByRole('alert').querySelector('p')).toHaveClass('text-warning');
    });

    it('renders critical severity with XCircle icon', () => {
      render(<ErrorMessage message="Critical" severity="critical" />);
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });
  });

  describe('details', () => {
    it('shows details toggle when details provided', () => {
      render(<ErrorMessage message="Error" details="More info" />);
      expect(screen.getByText('Show details')).toBeInTheDocument();
    });

    it('toggles details visibility', async () => {
      const user = userEvent.setup();
      render(<ErrorMessage message="Error" details="More info here" />);

      // Initially hidden
      expect(screen.queryByText('More info here')).not.toBeInTheDocument();

      // Show details
      await user.click(screen.getByText('Show details'));
      expect(screen.getByText('More info here')).toBeInTheDocument();
      expect(screen.getByText('Hide details')).toBeInTheDocument();

      // Hide details
      await user.click(screen.getByText('Hide details'));
      await waitFor(() => {
        expect(screen.queryByText('More info here')).not.toBeInTheDocument();
      });
    });

    it('sets aria-expanded on details toggle', async () => {
      const user = userEvent.setup();
      render(<ErrorMessage message="Error" details="More info" />);

      const toggle = screen.getByText('Show details');
      expect(toggle).toHaveAttribute('aria-expanded', 'false');

      await user.click(toggle);
      expect(screen.getByText('Hide details')).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('actions', () => {
    it('renders retry button when onRetry provided', () => {
      const onRetry = vi.fn();
      render(<ErrorMessage message="Error" onRetry={onRetry} />);
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('calls onRetry when clicked', async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();
      render(<ErrorMessage message="Error" onRetry={onRetry} />);

      await user.click(screen.getByRole('button', { name: /retry/i }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('shows loading state when isRetrying', () => {
      render(<ErrorMessage message="Error" onRetry={() => {}} isRetrying />);
      expect(screen.getByText('Retrying...')).toBeInTheDocument();
    });

    it('uses custom retryText', () => {
      render(<ErrorMessage message="Error" onRetry={() => {}} retryText="Try Again" />);
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('renders dismiss button when onDismiss provided', () => {
      render(<ErrorMessage message="Error" onDismiss={() => {}} />);
      expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
    });

    it('calls onDismiss when clicked', async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();
      render(<ErrorMessage message="Error" onDismiss={onDismiss} />);

      await user.click(screen.getByRole('button', { name: /dismiss/i }));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('has role="alert"', () => {
      render(<ErrorMessage message="Error" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('has aria-live="assertive"', () => {
      render(<ErrorMessage message="Error" />);
      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
    });

    it('icon has aria-hidden', () => {
      render(<ErrorMessage message="Error" showIcon />);
      const icon = screen.getByRole('alert').querySelector('svg');
      expect(icon?.closest('span')).toHaveAttribute('aria-hidden', 'true');
    });
  });
});

describe('FormError', () => {
  it('renders nothing when message is null', () => {
    const { container } = render(<FormError message={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when message is undefined', () => {
    const { container } = render(<FormError message={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders error message', () => {
    render(<FormError message="This field is required" />);
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
  });

  it('includes error icon', () => {
    render(<FormError message="Error" />);
    expect(screen.getByRole('alert').querySelector('svg')).toBeInTheDocument();
  });

  it('sets id for aria-describedby when fieldId provided', () => {
    render(<FormError message="Error" fieldId="email" />);
    expect(screen.getByRole('alert')).toHaveAttribute('id', 'email-error');
  });

  it('applies custom className', () => {
    render(<FormError message="Error" className="custom-class" />);
    expect(screen.getByRole('alert')).toHaveClass('custom-class');
  });

  it('has role="alert"', () => {
    render(<FormError message="Error" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('FormErrorList', () => {
  it('renders nothing when errors array is empty', () => {
    const { container } = render(<FormErrorList errors={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders list of errors', () => {
    render(<FormErrorList errors={['Error 1', 'Error 2', 'Error 3']} />);
    expect(screen.getByText('Error 1')).toBeInTheDocument();
    expect(screen.getByText('Error 2')).toBeInTheDocument();
    expect(screen.getByText('Error 3')).toBeInTheDocument();
  });

  it('renders default title', () => {
    render(<FormErrorList errors={['Error']} />);
    expect(screen.getByText('Please fix the following errors:')).toBeInTheDocument();
  });

  it('renders custom title', () => {
    render(<FormErrorList errors={['Error']} title="Fix these issues:" />);
    expect(screen.getByText('Fix these issues:')).toBeInTheDocument();
  });

  it('has role="alert"', () => {
    render(<FormErrorList errors={['Error']} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<FormErrorList errors={['Error']} className="custom-class" />);
    expect(screen.getByRole('alert')).toHaveClass('custom-class');
  });
});

describe('ApiError', () => {
  describe('rendering', () => {
    it('renders title and message', () => {
      render(<ApiError title="Connection Error" message="Could not connect to server" />);
      expect(screen.getByText('Connection Error')).toBeInTheDocument();
      expect(screen.getByText('Could not connect to server')).toBeInTheDocument();
    });

    it('renders default title when not provided', () => {
      render(<ApiError message="Error message" />);
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('has role="alert"', () => {
      render(<ApiError message="Error" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('technical details', () => {
    it('shows technical details toggle when enabled', () => {
      render(
        <ApiError
          message="Error"
          showTechnicalDetails
          details={{ statusCode: 500, code: 'INTERNAL_ERROR' }}
        />
      );
      expect(screen.getByText('Show technical details')).toBeInTheDocument();
    });

    it('does not show toggle when showTechnicalDetails is false', () => {
      render(
        <ApiError
          message="Error"
          showTechnicalDetails={false}
          details={{ statusCode: 500 }}
        />
      );
      expect(screen.queryByText('Show technical details')).not.toBeInTheDocument();
    });

    it('toggles technical details visibility', async () => {
      const user = userEvent.setup();
      render(
        <ApiError
          message="Error"
          showTechnicalDetails
          details={{
            statusCode: 500,
            code: 'INTERNAL_ERROR',
            requestId: 'req-123',
          }}
        />
      );

      // Initially hidden
      expect(screen.queryByText('500')).not.toBeInTheDocument();

      // Show details
      await user.click(screen.getByText('Show technical details'));
      expect(screen.getByText('500')).toBeInTheDocument();
      expect(screen.getByText('INTERNAL_ERROR')).toBeInTheDocument();
      expect(screen.getByText('req-123')).toBeInTheDocument();
    });

    it('formats timestamp correctly', async () => {
      const user = userEvent.setup();
      const timestamp = new Date('2024-01-15T10:30:00Z');
      render(
        <ApiError
          message="Error"
          showTechnicalDetails
          details={{ timestamp }}
        />
      );

      await user.click(screen.getByText('Show technical details'));
      // Check that Time label exists (actual format depends on locale)
      expect(screen.getByText('Time:')).toBeInTheDocument();
    });
  });

  describe('actions', () => {
    it('renders retry button when onRetry provided', () => {
      render(<ApiError message="Error" onRetry={() => {}} />);
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('calls onRetry when clicked', async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();
      render(<ApiError message="Error" onRetry={onRetry} />);

      await user.click(screen.getByRole('button', { name: /try again/i }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('shows loading state when isRetrying', () => {
      render(<ApiError message="Error" onRetry={() => {}} isRetrying />);
      expect(screen.getByText('Retrying...')).toBeInTheDocument();
    });

    it('renders dismiss button when onDismiss provided', () => {
      render(<ApiError message="Error" onDismiss={() => {}} />);
      expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
    });

    it('calls onDismiss when clicked', async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();
      render(<ApiError message="Error" onDismiss={onDismiss} />);

      await user.click(screen.getByRole('button', { name: /dismiss/i }));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });
});

describe('ErrorBoundary', () => {
  // Suppress console.error for error boundary tests
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
    if (shouldThrow) {
      throw new Error('Test error');
    }
    return <div>Content</div>;
  };

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders default fallback when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
  });

  it('renders fallbackRender when provided', () => {
    render(
      <ErrorBoundary
        fallbackRender={({ error, resetErrorBoundary }) => (
          <div>
            <span>Error: {error.message}</span>
            <button onClick={resetErrorBoundary}>Reset</button>
          </div>
        )}
      >
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Error: Test error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });

  it('calls onError when error is caught', () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('resets error boundary when reset is called', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();

    // Create a component that can toggle error state
    let shouldError = true;
    const DynamicErrorComponent: React.FC = () => {
      if (shouldError) {
        throw new Error('Test error');
      }
      return <div>Content</div>;
    };

    const { rerender } = render(
      <ErrorBoundary onReset={onReset} key="boundary">
        <DynamicErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Test error')).toBeInTheDocument();

    // Change state before clicking reset
    shouldError = false;

    // Click try again - this calls resetErrorBoundary which calls onReset and resets state
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(onReset).toHaveBeenCalled();

    // After reset, ErrorBoundary re-renders children (which no longer throws)
    // The component should now render normally
    await waitFor(() => {
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });
});

describe('ErrorBoundaryFallback', () => {
  it('renders error message', () => {
    const error = new Error('Test error message');
    render(
      <ErrorBoundaryFallback error={error} resetErrorBoundary={() => {}} />
    );
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('renders "Something went wrong" title', () => {
    const error = new Error('Error');
    render(
      <ErrorBoundaryFallback error={error} resetErrorBoundary={() => {}} />
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders try again button', () => {
    const error = new Error('Error');
    render(
      <ErrorBoundaryFallback error={error} resetErrorBoundary={() => {}} />
    );
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('calls resetErrorBoundary when button clicked', async () => {
    const user = userEvent.setup();
    const resetErrorBoundary = vi.fn();
    const error = new Error('Error');

    render(
      <ErrorBoundaryFallback error={error} resetErrorBoundary={resetErrorBoundary} />
    );

    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(resetErrorBoundary).toHaveBeenCalledTimes(1);
  });

  it('has role="alert"', () => {
    const error = new Error('Error');
    render(
      <ErrorBoundaryFallback error={error} resetErrorBoundary={() => {}} />
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('ErrorIcon', () => {
  it('renders with default size (md)', () => {
    render(<ErrorIcon />);
    const svg = document.querySelector('svg');
    expect(svg).toHaveClass('h-5', 'w-5');
  });

  it('renders with small size', () => {
    render(<ErrorIcon size="sm" />);
    const svg = document.querySelector('svg');
    expect(svg).toHaveClass('h-4', 'w-4');
  });

  it('renders with large size', () => {
    render(<ErrorIcon size="lg" />);
    const svg = document.querySelector('svg');
    expect(svg).toHaveClass('h-6', 'w-6');
  });

  it('renders error variant with destructive color', () => {
    render(<ErrorIcon variant="error" />);
    // Check parent span has the color class
    const span = document.querySelector('span');
    expect(span).toHaveClass('text-destructive');
  });

  it('renders warning variant with warning color', () => {
    render(<ErrorIcon variant="warning" />);
    const span = document.querySelector('span');
    expect(span).toHaveClass('text-warning');
  });

  it('applies custom className', () => {
    render(<ErrorIcon className="custom-class" />);
    const span = document.querySelector('span');
    expect(span).toHaveClass('custom-class');
  });

  it('has aria-hidden on icon', () => {
    render(<ErrorIcon />);
    const span = document.querySelector('span');
    expect(span).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('ShakeContainer', () => {
  it('renders children', () => {
    render(
      <ShakeContainer shake={false}>
        <div>Content</div>
      </ShakeContainer>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('applies className', () => {
    render(
      <ShakeContainer shake={false} className="custom-class">
        <div>Content</div>
      </ShakeContainer>
    );
    expect(screen.getByText('Content').parentElement).toHaveClass('custom-class');
  });

  it('triggers animation when shake is true', () => {
    const { rerender } = render(
      <ShakeContainer shake={false}>
        <div>Content</div>
      </ShakeContainer>
    );

    rerender(
      <ShakeContainer shake={true}>
        <div>Content</div>
      </ShakeContainer>
    );

    const container = screen.getByText('Content').parentElement;
    expect(container).toHaveAttribute('data-animate', 'shake');
  });

  it('calls onShakeComplete when animation finishes', async () => {
    vi.useFakeTimers();
    const onShakeComplete = vi.fn();

    render(
      <ShakeContainer shake={true} onShakeComplete={onShakeComplete}>
        <div>Content</div>
      </ShakeContainer>
    );

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(onShakeComplete).toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe('useErrorShake', () => {
  const TestComponent: React.FC = () => {
    const { isShaking, triggerShake, onShakeComplete, shakeProps } = useErrorShake();
    return (
      <div>
        <span data-testid="shaking">{isShaking ? 'shaking' : 'not-shaking'}</span>
        <button onClick={triggerShake}>Trigger</button>
        <button onClick={onShakeComplete}>Complete</button>
        <span data-testid="shake-prop">{shakeProps.shake ? 'true' : 'false'}</span>
      </div>
    );
  };

  it('starts with isShaking false', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('shaking')).toHaveTextContent('not-shaking');
  });

  it('sets isShaking true when triggerShake called', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    await user.click(screen.getByText('Trigger'));
    expect(screen.getByTestId('shaking')).toHaveTextContent('shaking');
  });

  it('sets isShaking false when onShakeComplete called', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    await user.click(screen.getByText('Trigger'));
    expect(screen.getByTestId('shaking')).toHaveTextContent('shaking');

    await user.click(screen.getByText('Complete'));
    expect(screen.getByTestId('shaking')).toHaveTextContent('not-shaking');
  });

  it('provides shakeProps with correct values', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    expect(screen.getByTestId('shake-prop')).toHaveTextContent('false');

    await user.click(screen.getByText('Trigger'));
    expect(screen.getByTestId('shake-prop')).toHaveTextContent('true');
  });
});

describe('useApiError', () => {
  const TestComponent: React.FC<{ autoDismissAfter?: number }> = ({ autoDismissAfter }) => {
    const { error, setError, clearError, handleError, hasError } = useApiError({
      autoDismissAfter,
    });

    return (
      <div>
        <span data-testid="has-error">{hasError ? 'has-error' : 'no-error'}</span>
        <span data-testid="error-message">{error?.message || 'none'}</span>
        <span data-testid="error-code">{error?.details?.code || 'none'}</span>
        <button onClick={() => setError('Custom error', { code: 'CUSTOM' })}>
          Set Error
        </button>
        <button onClick={clearError}>Clear</button>
        <button onClick={() => handleError(new Error('Handled error'))}>
          Handle Error
        </button>
        <button onClick={() => handleError('String error')}>
          Handle String
        </button>
        <button onClick={() => handleError({ unknown: true })}>
          Handle Unknown
        </button>
      </div>
    );
  };

  it('starts with no error', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('has-error')).toHaveTextContent('no-error');
  });

  it('sets error with setError', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    await user.click(screen.getByText('Set Error'));
    expect(screen.getByTestId('has-error')).toHaveTextContent('has-error');
    expect(screen.getByTestId('error-message')).toHaveTextContent('Custom error');
    expect(screen.getByTestId('error-code')).toHaveTextContent('CUSTOM');
  });

  it('clears error with clearError', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    await user.click(screen.getByText('Set Error'));
    expect(screen.getByTestId('has-error')).toHaveTextContent('has-error');

    await user.click(screen.getByText('Clear'));
    expect(screen.getByTestId('has-error')).toHaveTextContent('no-error');
  });

  it('handles Error objects with handleError', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    await user.click(screen.getByText('Handle Error'));
    expect(screen.getByTestId('error-message')).toHaveTextContent('Handled error');
  });

  it('handles string errors with handleError', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    await user.click(screen.getByText('Handle String'));
    expect(screen.getByTestId('error-message')).toHaveTextContent('String error');
  });

  it('handles unknown errors with default message', async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    await user.click(screen.getByText('Handle Unknown'));
    expect(screen.getByTestId('error-message')).toHaveTextContent('An error occurred');
  });

  it('auto-dismisses after specified duration', async () => {
    vi.useFakeTimers();
    render(<TestComponent autoDismissAfter={1000} />);

    // Set error
    await act(async () => {
      fireEvent.click(screen.getByText('Set Error'));
    });
    expect(screen.getByTestId('has-error')).toHaveTextContent('has-error');

    // Wait for auto-dismiss
    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(screen.getByTestId('has-error')).toHaveTextContent('no-error');
    vi.useRealTimers();
  });
});

describe('Animation variants', () => {
  it('errorShake has correct keyframes', () => {
    expect(errorShake.shake.x).toEqual([0, -10, 10, -10, 10, -5, 5, 0]);
  });

  it('errorFadeIn has hidden, visible, and exit states', () => {
    expect(errorFadeIn.hidden).toBeDefined();
    expect(errorFadeIn.visible).toBeDefined();
    expect(errorFadeIn.exit).toBeDefined();
  });

  it('errorSlideIn has correct x translation', () => {
    expect(errorSlideIn.hidden.x).toBe(20);
    expect(errorSlideIn.visible.x).toBe(0);
  });

  it('bannerSlideDown has height animation', () => {
    expect(bannerSlideDown.hidden.height).toBe(0);
    expect(bannerSlideDown.visible.height).toBe('auto');
  });

  it('iconPulse has scale animation', () => {
    expect(iconPulse.pulse.scale).toEqual([1, 1.1, 1]);
  });
});

describe('Constants', () => {
  it('ERROR_VARIANTS has expected keys', () => {
    expect(ERROR_VARIANTS.inline).toBe('inline');
    expect(ERROR_VARIANTS.toast).toBe('toast');
    expect(ERROR_VARIANTS.banner).toBe('banner');
  });

  it('ERROR_SEVERITIES has expected keys', () => {
    expect(ERROR_SEVERITIES.error).toBe('error');
    expect(ERROR_SEVERITIES.warning).toBe('warning');
    expect(ERROR_SEVERITIES.critical).toBe('critical');
  });
});

describe('errorClasses', () => {
  it('has text class', () => {
    expect(errorClasses.text).toBe('text-destructive');
  });

  it('has warning text class', () => {
    expect(errorClasses.textWarning).toBe('text-warning');
  });

  it('has background class', () => {
    expect(errorClasses.bg).toBe('bg-destructive/10');
  });

  it('has border class', () => {
    expect(errorClasses.border).toBe('border-destructive/50');
  });

  it('has input class for form fields', () => {
    expect(errorClasses.input).toContain('border-destructive');
    expect(errorClasses.input).toContain('focus-visible:ring-destructive');
  });

  it('has container class', () => {
    expect(errorClasses.container).toContain('border');
    expect(errorClasses.container).toContain('bg-destructive/10');
  });
});

describe('Accessibility', () => {
  it('ErrorMessage uses semantic alert role', () => {
    render(<ErrorMessage message="Error" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('FormError uses semantic alert role', () => {
    render(<FormError message="Error" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('FormErrorList uses semantic alert role', () => {
    render(<FormErrorList errors={['Error']} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('ApiError uses semantic alert role', () => {
    render(<ApiError message="Error" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('ErrorBoundaryFallback uses semantic alert role', () => {
    render(
      <ErrorBoundaryFallback error={new Error('Error')} resetErrorBoundary={() => {}} />
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('ErrorMessage supports aria-live assertive', () => {
    render(<ErrorMessage message="Error" />);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });

  it('FormErrorList supports aria-live assertive', () => {
    render(<FormErrorList errors={['Error']} />);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });

  it('ApiError supports aria-live assertive', () => {
    render(<ApiError message="Error" />);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });
});
