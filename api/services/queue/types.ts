/**
 * Queue System Types
 *
 * Defines interfaces for the rate limiting and queue management system.
 */

import { PlatformName } from '../platforms/types';

/**
 * Rate limit configuration for a single platform
 */
export interface PlatformLimits {
  platform: PlatformName;
  /** Maximum concurrent requests allowed */
  maxConcurrent: number;
  /** Maximum requests per minute */
  requestsPerMinute: number;
  /** Delay in ms before retrying after rate limit */
  retryAfterMs: number;
}

/**
 * Current status of rate limiting for a platform
 */
export interface RateLimitStatus {
  platform: PlatformName;
  /** Currently active requests */
  activeCount: number;
  /** Available slots for new requests */
  availableSlots: number;
  /** Requests made in the current minute window */
  requestsInWindow: number;
  /** Whether the platform is currently rate limited */
  isLimited: boolean;
  /** If limited, when it will be available again (estimated) */
  availableInMs?: number;
}

/**
 * Result of attempting to acquire a rate limit slot
 */
export interface AcquireResult {
  /** Whether the slot was acquired */
  acquired: boolean;
  /** If not acquired, reason why */
  reason?: 'max_concurrent' | 'rpm_exceeded';
  /** If not acquired, how long to wait before retrying */
  retryAfterMs?: number;
}

/**
 * Global rate limiter status across all platforms
 */
export interface GlobalRateLimitStatus {
  platforms: RateLimitStatus[];
  /** Total active requests across all platforms */
  totalActive: number;
  /** Timestamp of status check */
  timestamp: Date;
}

/**
 * Default platform rate limits
 * Based on estimated safe limits for each LLM provider
 */
export const DEFAULT_PLATFORM_LIMITS: PlatformLimits[] = [
  { platform: 'chatgpt', maxConcurrent: 3, requestsPerMinute: 60, retryAfterMs: 1000 },
  { platform: 'claude', maxConcurrent: 2, requestsPerMinute: 50, retryAfterMs: 1200 },
  { platform: 'perplexity', maxConcurrent: 1, requestsPerMinute: 20, retryAfterMs: 3000 },
  { platform: 'gemini', maxConcurrent: 4, requestsPerMinute: 60, retryAfterMs: 1000 },
  { platform: 'grok', maxConcurrent: 1, requestsPerMinute: 60, retryAfterMs: 1000 },
  { platform: 'deepseek', maxConcurrent: 2, requestsPerMinute: 60, retryAfterMs: 1000 },
  { platform: 'google-ai-overview', maxConcurrent: 1, requestsPerMinute: 10, retryAfterMs: 6000 },
  { platform: 'google-ai-mode', maxConcurrent: 1, requestsPerMinute: 10, retryAfterMs: 6000 },
];

// =====================================================
// Queue Manager Types
// =====================================================

/**
 * Status of a queued request
 */
export type QueuedRequestStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Priority level for requests
 */
export type RequestPriority = 'high' | 'normal';

/**
 * A request in the queue
 */
export interface QueuedRequest {
  /** Unique identifier for this queue entry */
  id: string;
  /** ID of the prompt in the database */
  promptId: number;
  /** Target platform for this request */
  platform: PlatformName;
  /** The prompt text to send */
  prompt: string;
  /** When the request was added to the queue */
  addedAt: number;
  /** Number of retry attempts */
  retryCount: number;
  /** Priority level (high requests processed first) */
  priority: RequestPriority;
  /** Current status */
  status: QueuedRequestStatus;
  /** Timeout in ms (optional, defaults to 60000) */
  timeoutMs?: number;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Options for creating a queue request
 */
export interface EnqueueOptions {
  promptId: number;
  platform: PlatformName;
  prompt: string;
  priority?: RequestPriority;
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Result of processing a request
 */
export interface ProcessResult {
  success: boolean;
  data?: unknown;
  error?: string;
  errorType?: 'timeout' | 'rate_limit' | 'execution_error' | 'unknown';
  durationMs: number;
}

/**
 * Status of a single platform queue
 */
export interface PlatformQueueStatus {
  platform: PlatformName;
  /** Number of pending requests */
  pending: number;
  /** Number of currently processing requests */
  processing: number;
  /** Whether queue processing is paused */
  paused: boolean;
  /** Rate limit status */
  rateLimit: RateLimitStatus;
}

/**
 * Overall queue system status
 */
export interface QueueStatus {
  /** Status per platform */
  platforms: Record<PlatformName, PlatformQueueStatus>;
  /** Total pending across all platforms */
  totalPending: number;
  /** Total processing across all platforms */
  totalProcessing: number;
  /** Timestamp of status check */
  timestamp: Date;
}

/**
 * Retry decision from retry handler (for events)
 */
export interface RetryDecisionEvent {
  shouldRetry: boolean;
  reason: string;
  delayMs?: number;
  errorClassification: {
    category: string;
    isRetryable: boolean;
    message: string;
  };
}

/**
 * Events emitted by the queue manager
 */
export interface QueueEvents {
  /** Fired when a request is enqueued */
  enqueued: { request: QueuedRequest };
  /** Fired when a request starts processing */
  processing: { request: QueuedRequest };
  /** Fired when a request completes successfully */
  completed: { request: QueuedRequest; result: ProcessResult };
  /** Fired when a request fails permanently (no more retries) */
  failed: { request: QueuedRequest; result: ProcessResult };
  /** Fired when a request times out */
  timeout: { request: QueuedRequest };
  /** Fired when a retry decision is made (for monitoring) */
  retry: { request: QueuedRequest; result: ProcessResult; decision: RetryDecisionEvent };
  /** Fired when a queue is paused */
  paused: { platform: PlatformName };
  /** Fired when a queue is resumed */
  resumed: { platform: PlatformName };
}

/**
 * Request executor function type
 * Implementations should handle the actual API call
 */
export type RequestExecutor = (request: QueuedRequest) => Promise<ProcessResult>;

/**
 * Queue manager configuration
 */
export interface QueueManagerConfig {
  /** Default timeout for requests in ms */
  defaultTimeoutMs: number;
  /** Maximum retry attempts per request */
  maxRetries: number;
  /** Delay between retry attempts in ms */
  retryDelayMs: number;
  /** Maximum queue size per platform (0 = unlimited) */
  maxQueueSize: number;
  /** Whether to start processing immediately on enqueue */
  autoProcess: boolean;
}
