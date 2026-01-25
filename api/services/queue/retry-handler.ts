/**
 * Retry Handler with Exponential Backoff
 *
 * Provides intelligent retry logic for failed API requests:
 * - Exponential backoff: 1s -> 2s -> 4s -> 8s (max)
 * - Jitter to prevent thundering herd
 * - Error categorization (retryable vs non-retryable)
 * - Max retries configuration
 * - Logging for debugging
 */

import { QueuedRequest, ProcessResult } from './types';

// =====================================================
// Configuration
// =====================================================

export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay in milliseconds */
  baseDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
  /** Jitter factor (0-1, e.g., 0.1 = 10% jitter) */
  jitterFactor: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
  jitterFactor: 0.1,
};

// =====================================================
// Error Categories
// =====================================================

/**
 * Error categories for classification
 */
export type ErrorCategory =
  | 'rate_limit'      // Retry with backoff
  | 'auth_error'      // Don't retry, notify
  | 'network_error'   // Retry with backoff
  | 'quota_exceeded'  // Don't retry, notify
  | 'model_not_found' // Don't retry, notify
  | 'timeout'         // Retry with backoff
  | 'unknown';        // Retry once

/**
 * Extended error information
 */
export interface PlatformError extends Error {
  status?: number;
  code?: string;
  response?: {
    status?: number;
    data?: unknown;
  };
}

/**
 * Result of error categorization
 */
export interface ErrorClassification {
  category: ErrorCategory;
  isRetryable: boolean;
  suggestedDelayMs?: number;
  message: string;
}

// =====================================================
// Error Classification
// =====================================================

/**
 * Categories that are retryable
 */
const RETRYABLE_CATEGORIES: ErrorCategory[] = [
  'rate_limit',
  'network_error',
  'timeout',
  'unknown',
];

/**
 * Check if an error category is retryable
 */
export function isRetryable(category: ErrorCategory): boolean {
  return RETRYABLE_CATEGORIES.includes(category);
}

/**
 * Categorize an error based on its properties
 */
export function categorizeError(error: unknown): ErrorClassification {
  const err = error as PlatformError;
  const message = err?.message ?? 'Unknown error';
  const status = err?.status ?? err?.response?.status;
  const code = err?.code;

  // Rate limit (429 Too Many Requests)
  if (status === 429) {
    return {
      category: 'rate_limit',
      isRetryable: true,
      suggestedDelayMs: extractRetryAfter(err),
      message: 'Rate limit exceeded',
    };
  }

  // Authentication errors (401 Unauthorized, 403 Forbidden)
  if (status === 401 || status === 403) {
    return {
      category: 'auth_error',
      isRetryable: false,
      message: 'Authentication failed',
    };
  }

  // Quota exceeded (402 Payment Required)
  if (status === 402) {
    return {
      category: 'quota_exceeded',
      isRetryable: false,
      message: 'Quota or billing limit exceeded',
    };
  }

  // Model not found (404 with model in message)
  if (status === 404 && message.toLowerCase().includes('model')) {
    return {
      category: 'model_not_found',
      isRetryable: false,
      message: 'Model not found or unavailable',
    };
  }

  // Network errors (connection issues)
  if (code === 'ENOTFOUND' || code === 'ETIMEDOUT' || code === 'ECONNREFUSED' || code === 'ECONNRESET') {
    return {
      category: 'network_error',
      isRetryable: true,
      message: `Network error: ${code}`,
    };
  }

  // Timeout
  if (message.toLowerCase().includes('timeout') || code === 'TIMEOUT') {
    return {
      category: 'timeout',
      isRetryable: true,
      message: 'Request timed out',
    };
  }

  // Server errors (5xx) - generally retryable
  if (status && status >= 500 && status < 600) {
    return {
      category: 'unknown',
      isRetryable: true,
      message: `Server error: ${status}`,
    };
  }

  // Default: unknown error, retry once
  return {
    category: 'unknown',
    isRetryable: true,
    message,
  };
}

/**
 * Extract Retry-After header value if present
 */
function extractRetryAfter(error: PlatformError): number | undefined {
  // Some APIs include retry-after in the response headers
  const response = error?.response as any;
  const retryAfter = response?.headers?.['retry-after'];

  if (retryAfter) {
    // Could be seconds or a date
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      return seconds * 1000; // Convert to ms
    }
  }

  return undefined;
}

// =====================================================
// Backoff Calculation
// =====================================================

/**
 * Calculate exponential backoff delay with jitter
 *
 * Formula: min(maxDelay, baseDelay * 2^retryCount) + jitter
 *
 * @param retryCount Current retry attempt (0-indexed)
 * @param config Retry configuration
 * @returns Delay in milliseconds
 */
export function calculateBackoff(retryCount: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
  const { baseDelayMs, maxDelayMs, jitterFactor } = config;

  // Exponential backoff: 1s, 2s, 4s, 8s, etc.
  const exponentialDelay = baseDelayMs * Math.pow(2, retryCount);
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  // Add jitter to prevent thundering herd
  const jitter = cappedDelay * jitterFactor * Math.random();
  const finalDelay = Math.round(cappedDelay + jitter);

  return finalDelay;
}

/**
 * Calculate backoff with a suggested delay override (e.g., from Retry-After header)
 */
export function calculateBackoffWithSuggestion(
  retryCount: number,
  suggestedDelayMs?: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const calculatedDelay = calculateBackoff(retryCount, config);

  // Use the longer of calculated or suggested delay
  if (suggestedDelayMs && suggestedDelayMs > calculatedDelay) {
    return suggestedDelayMs;
  }

  return calculatedDelay;
}

// =====================================================
// Retry Handler
// =====================================================

/**
 * Result of a retry decision
 */
export interface RetryDecision {
  shouldRetry: boolean;
  reason: string;
  delayMs?: number;
  errorClassification: ErrorClassification;
}

/**
 * Determine if a request should be retried
 */
export function shouldRetryRequest(
  request: QueuedRequest,
  error: unknown,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): RetryDecision {
  const classification = categorizeError(error);

  // Check if error is retryable
  if (!classification.isRetryable) {
    return {
      shouldRetry: false,
      reason: `Non-retryable error: ${classification.category}`,
      errorClassification: classification,
    };
  }

  // Check if max retries reached
  if (request.retryCount >= config.maxRetries) {
    return {
      shouldRetry: false,
      reason: `Max retries (${config.maxRetries}) exceeded`,
      errorClassification: classification,
    };
  }

  // Calculate delay
  const delayMs = calculateBackoffWithSuggestion(
    request.retryCount,
    classification.suggestedDelayMs,
    config
  );

  return {
    shouldRetry: true,
    reason: `Retryable error: ${classification.category} (attempt ${request.retryCount + 1}/${config.maxRetries})`,
    delayMs,
    errorClassification: classification,
  };
}

/**
 * Convert ProcessResult error type to ErrorCategory
 */
export function processResultToErrorCategory(result: ProcessResult): ErrorCategory {
  switch (result.errorType) {
    case 'timeout':
      return 'timeout';
    case 'rate_limit':
      return 'rate_limit';
    case 'execution_error':
    case 'unknown':
    default:
      return 'unknown';
  }
}

// =====================================================
// Logging
// =====================================================

/**
 * Log levels for retry events
 */
export type RetryLogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Retry event for logging
 */
export interface RetryEvent {
  level: RetryLogLevel;
  message: string;
  requestId: string;
  platform: string;
  retryCount: number;
  errorCategory: ErrorCategory;
  delayMs?: number;
}

/**
 * Create a log event for a retry attempt
 */
export function createRetryLogEvent(
  request: QueuedRequest,
  decision: RetryDecision
): RetryEvent {
  if (decision.shouldRetry) {
    return {
      level: 'info',
      message: `Retrying request ${request.id} for ${request.platform} in ${decision.delayMs}ms (attempt ${request.retryCount + 1})`,
      requestId: request.id,
      platform: request.platform,
      retryCount: request.retryCount,
      errorCategory: decision.errorClassification.category,
      delayMs: decision.delayMs,
    };
  }

  return {
    level: 'warn',
    message: `Request ${request.id} for ${request.platform} permanently failed: ${decision.reason}`,
    requestId: request.id,
    platform: request.platform,
    retryCount: request.retryCount,
    errorCategory: decision.errorClassification.category,
  };
}

/**
 * Simple console logger for retry events
 * In production, this should integrate with a proper logging system
 */
export function logRetryEvent(event: RetryEvent): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [RETRY]`;

  switch (event.level) {
    case 'debug':
      console.debug(`${prefix} ${event.message}`);
      break;
    case 'info':
      console.info(`${prefix} ${event.message}`);
      break;
    case 'warn':
      console.warn(`${prefix} ${event.message}`);
      break;
    case 'error':
      console.error(`${prefix} ${event.message}`);
      break;
  }
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Async delay function
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn Function to retry
 * @param config Retry configuration
 * @returns Result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const classification = categorizeError(error);

      // Don't retry non-retryable errors
      if (!classification.isRetryable) {
        throw error;
      }

      // Don't delay on the last attempt
      if (attempt < config.maxRetries) {
        const delayMs = calculateBackoffWithSuggestion(
          attempt,
          classification.suggestedDelayMs,
          config
        );

        console.info(
          `[RETRY] Attempt ${attempt + 1}/${config.maxRetries + 1} failed: ${classification.message}. Retrying in ${delayMs}ms...`
        );

        await delay(delayMs);
      }
    }
  }

  throw lastError;
}
