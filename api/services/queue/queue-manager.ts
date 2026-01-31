/**
 * Platform Queue Manager
 *
 * Manages request queues for each LLM platform with:
 * - Priority-based queue ordering (high priority first)
 * - Integration with rate limiter
 * - Event emission for request lifecycle
 * - Pause/resume per platform
 * - Request timeout handling
 * - Automatic retry on failure
 */

import { EventEmitter } from 'events';
import { PlatformName } from '../platforms/types';
import {
  QueuedRequest,
  QueuedRequestStatus,
  RequestPriority,
  EnqueueOptions,
  ProcessResult,
  PlatformQueueStatus,
  QueueStatus,
  QueueEvents,
  RequestExecutor,
  QueueManagerConfig,
  DEFAULT_PLATFORM_LIMITS,
} from './types';
import { PlatformRateLimiter, getRateLimiter } from './rate-limiter';
import {
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  shouldRetryRequest,
  calculateBackoff,
  createRetryLogEvent,
  logRetryEvent,
  categorizeError,
} from './retry-handler';

// Default configuration (now uses retry handler for backoff)
const DEFAULT_CONFIG: QueueManagerConfig = {
  defaultTimeoutMs: 60_000,
  maxRetries: DEFAULT_RETRY_CONFIG.maxRetries,
  retryDelayMs: DEFAULT_RETRY_CONFIG.baseDelayMs, // Base delay for exponential backoff
  maxQueueSize: 100,
  autoProcess: true,
};

// All platforms from the default limits
const ALL_PLATFORMS: PlatformName[] = DEFAULT_PLATFORM_LIMITS.map(l => l.platform);

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Platform Queue Manager
 */
export class PlatformQueueManager extends EventEmitter {
  private readonly queues: Map<PlatformName, QueuedRequest[]>;
  private readonly processing: Map<PlatformName, Set<string>>;
  private readonly paused: Map<PlatformName, boolean>;
  private readonly rateLimiter: PlatformRateLimiter;
  private readonly config: QueueManagerConfig;
  private readonly retryConfig: RetryConfig;
  private executor: RequestExecutor | null = null;
  private processingLoops: Map<PlatformName, boolean> = new Map();

  constructor(
    rateLimiter?: PlatformRateLimiter,
    config?: Partial<QueueManagerConfig>,
    retryConfig?: Partial<RetryConfig>
  ) {
    super();
    this.queues = new Map();
    this.processing = new Map();
    this.paused = new Map();
    this.rateLimiter = rateLimiter ?? getRateLimiter();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Derive retry config from queue config unless explicitly provided
    // This ensures backward compatibility with existing code that sets maxRetries in queue config
    this.retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      maxRetries: this.config.maxRetries, // Use queue config's maxRetries by default
      baseDelayMs: this.config.retryDelayMs, // Use queue config's retryDelayMs as base
      ...retryConfig, // Allow explicit override
    };

    // Initialize queues for all platforms
    for (const platform of ALL_PLATFORMS) {
      this.queues.set(platform, []);
      this.processing.set(platform, new Set());
      this.paused.set(platform, false);
    }
  }

  /**
   * Set the request executor function
   * This must be set before processing can begin
   */
  setExecutor(executor: RequestExecutor): void {
    this.executor = executor;
  }

  /**
   * Enqueue a new request
   */
  async enqueue(options: EnqueueOptions): Promise<QueuedRequest> {
    const { platform, promptId, prompt, priority = 'normal', timeoutMs, metadata } = options;

    // Check queue size limit
    const queue = this.queues.get(platform) ?? [];
    if (this.config.maxQueueSize > 0 && queue.length >= this.config.maxQueueSize) {
      throw new Error(`Queue for ${platform} is full (max: ${this.config.maxQueueSize})`);
    }

    // Create the request
    const request: QueuedRequest = {
      id: generateRequestId(),
      promptId,
      platform,
      prompt,
      addedAt: Date.now(),
      retryCount: 0,
      priority,
      status: 'pending',
      timeoutMs: timeoutMs ?? this.config.defaultTimeoutMs,
      metadata,
    };

    // Insert by priority (high priority at front)
    if (priority === 'high') {
      const insertIndex = queue.findIndex(r => r.priority !== 'high');
      if (insertIndex === -1) {
        queue.push(request);
      } else {
        queue.splice(insertIndex, 0, request);
      }
    } else {
      queue.push(request);
    }

    this.queues.set(platform, queue);

    // Emit enqueued event
    this.emit('enqueued', { request });

    // Start processing if autoProcess is enabled
    if (this.config.autoProcess) {
      this.processQueue(platform);
    }

    return request;
  }

  /**
   * Get the length of a platform's queue
   */
  getQueueLength(platform: PlatformName): number {
    return this.queues.get(platform)?.length ?? 0;
  }

  /**
   * Get the number of currently processing requests for a platform
   */
  getProcessingCount(platform: PlatformName): number {
    return this.processing.get(platform)?.size ?? 0;
  }

  /**
   * Check if a platform is paused
   */
  isPaused(platform: PlatformName): boolean {
    return this.paused.get(platform) ?? false;
  }

  /**
   * Pause processing for a platform
   */
  pause(platform: PlatformName): void {
    if (!this.paused.get(platform)) {
      this.paused.set(platform, true);
      this.emit('paused', { platform });
    }
  }

  /**
   * Resume processing for a platform
   */
  resume(platform: PlatformName): void {
    if (this.paused.get(platform)) {
      this.paused.set(platform, false);
      this.emit('resumed', { platform });
      // Restart processing
      if (this.config.autoProcess) {
        this.processQueue(platform);
      }
    }
  }

  /**
   * Pause all platforms
   */
  pauseAll(): void {
    for (const platform of ALL_PLATFORMS) {
      this.pause(platform);
    }
  }

  /**
   * Resume all platforms
   */
  resumeAll(): void {
    for (const platform of ALL_PLATFORMS) {
      this.resume(platform);
    }
  }

  /**
   * Get status for a single platform
   */
  getPlatformStatus(platform: PlatformName): PlatformQueueStatus {
    return {
      platform,
      pending: this.getQueueLength(platform),
      processing: this.getProcessingCount(platform),
      paused: this.isPaused(platform),
      rateLimit: this.rateLimiter.getStatus(platform),
    };
  }

  /**
   * Get overall queue status
   */
  getStatus(): QueueStatus {
    const platforms: Record<PlatformName, PlatformQueueStatus> = {} as any;
    let totalPending = 0;
    let totalProcessing = 0;

    for (const platform of ALL_PLATFORMS) {
      const status = this.getPlatformStatus(platform);
      platforms[platform] = status;
      totalPending += status.pending;
      totalProcessing += status.processing;
    }

    return {
      platforms,
      totalPending,
      totalProcessing,
      timestamp: new Date(),
    };
  }

  /**
   * Get a request by ID
   */
  getRequest(requestId: string): QueuedRequest | undefined {
    for (const queue of Array.from(this.queues.values())) {
      const request = queue.find(r => r.id === requestId);
      if (request) return request;
    }
    return undefined;
  }

  /**
   * Remove a request from the queue (cancel it)
   */
  cancel(requestId: string): boolean {
    for (const [platform, queue] of Array.from(this.queues.entries())) {
      const index = queue.findIndex(r => r.id === requestId);
      if (index !== -1) {
        queue.splice(index, 1);
        this.queues.set(platform, queue);
        return true;
      }
    }
    return false;
  }

  /**
   * Clear all pending requests for a platform
   */
  clearQueue(platform: PlatformName): number {
    const queue = this.queues.get(platform) ?? [];
    const count = queue.length;
    this.queues.set(platform, []);
    return count;
  }

  /**
   * Clear all pending requests for all platforms
   */
  clearAllQueues(): number {
    let total = 0;
    for (const platform of ALL_PLATFORMS) {
      total += this.clearQueue(platform);
    }
    return total;
  }

  /**
   * Process the queue for a platform
   * This is the main processing loop
   */
  private async processQueue(platform: PlatformName): Promise<void> {
    // Prevent multiple processing loops for the same platform
    if (this.processingLoops.get(platform)) {
      return;
    }
    this.processingLoops.set(platform, true);

    try {
      while (true) {
        // Check if paused
        if (this.paused.get(platform)) {
          break;
        }

        // Check if there are requests to process
        const queue = this.queues.get(platform) ?? [];
        if (queue.length === 0) {
          break;
        }

        // Try to acquire rate limit slot
        const acquireResult = this.rateLimiter.acquire(platform);
        if (!acquireResult.acquired) {
          // Wait and retry
          await this.delay(acquireResult.retryAfterMs ?? 1000);
          continue;
        }

        // Get the next request
        const request = queue.shift();
        if (!request) {
          this.rateLimiter.release(platform);
          break;
        }

        this.queues.set(platform, queue);

        // Process the request
        await this.processRequest(request, platform);
      }
    } finally {
      this.processingLoops.set(platform, false);
    }
  }

  /**
   * Process a single request
   */
  private async processRequest(
    request: QueuedRequest,
    platform: PlatformName
  ): Promise<void> {
    // Track as processing
    const processingSet = this.processing.get(platform) ?? new Set();
    processingSet.add(request.id);
    this.processing.set(platform, processingSet);

    // Update status
    request.status = 'processing';
    this.emit('processing', { request });

    const startTime = Date.now();
    let result: ProcessResult;

    try {
      // Check if executor is set
      if (!this.executor) {
        throw new Error('No executor set. Call setExecutor() before processing.');
      }

      // Execute with timeout
      result = await this.executeWithTimeout(request);
    } catch (error) {
      result = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: 'execution_error',
        durationMs: Date.now() - startTime,
      };
    } finally {
      // Release rate limit slot
      this.rateLimiter.release(platform);

      // Remove from processing set
      processingSet.delete(request.id);
      this.processing.set(platform, processingSet);
    }

    // Handle result
    if (result.success) {
      request.status = 'completed';
      this.emit('completed', { request, result });
    } else {
      // Use the retry handler to determine if we should retry
      // Convert ProcessResult error to an error object for categorization
      const errorObj = this.createErrorFromResult(result);
      const retryDecision = shouldRetryRequest(request, errorObj, this.retryConfig);

      // Log the retry event
      const logEvent = createRetryLogEvent(request, retryDecision);
      logRetryEvent(logEvent);

      // Emit retry event for monitoring
      this.emit('retry', {
        request,
        result,
        decision: retryDecision,
      });

      if (retryDecision.shouldRetry) {
        request.retryCount++;
        request.status = 'pending';

        // Apply exponential backoff with jitter
        const backoffDelay = retryDecision.delayMs ?? calculateBackoff(request.retryCount - 1, this.retryConfig);
        await this.delay(backoffDelay);

        const queue = this.queues.get(platform) ?? [];
        // Add back to queue at front (high priority for retries)
        queue.unshift(request);
        this.queues.set(platform, queue);

        // Continue processing
        if (this.config.autoProcess && !this.paused.get(platform)) {
          this.processQueue(platform);
        }
      } else {
        request.status = 'failed';
        this.emit('failed', { request, result });
      }
    }
  }

  /**
   * Create an error object from ProcessResult for retry classification
   */
  private createErrorFromResult(result: ProcessResult): Error & { status?: number; code?: string } {
    const error = new Error(result.error ?? 'Unknown error') as Error & { status?: number; code?: string };

    // Map errorType to HTTP status codes for proper categorization
    if (result.errorType === 'rate_limit') {
      error.status = 429;
    } else if (result.errorType === 'timeout') {
      error.code = 'TIMEOUT';
    }

    return error;
  }

  /**
   * Execute a request with timeout
   */
  private async executeWithTimeout(request: QueuedRequest): Promise<ProcessResult> {
    const timeoutMs = request.timeoutMs ?? this.config.defaultTimeoutMs;
    const startTime = Date.now();

    return new Promise<ProcessResult>((resolve) => {
      const timeoutId = setTimeout(() => {
        this.emit('timeout', { request });
        resolve({
          success: false,
          error: `Request timed out after ${timeoutMs}ms`,
          errorType: 'timeout',
          durationMs: Date.now() - startTime,
        });
      }, timeoutMs);

      this.executor!(request)
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          resolve({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorType: 'execution_error',
            durationMs: Date.now() - startTime,
          });
        });
    });
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Manually trigger processing for a platform
   */
  triggerProcessing(platform: PlatformName): void {
    if (!this.paused.get(platform)) {
      this.processQueue(platform);
    }
  }

  /**
   * Manually trigger processing for all platforms
   */
  triggerAllProcessing(): void {
    for (const platform of ALL_PLATFORMS) {
      this.triggerProcessing(platform);
    }
  }

  /**
   * Type-safe event listener
   */
  on<K extends keyof QueueEvents>(
    event: K,
    listener: (data: QueueEvents[K]) => void
  ): this {
    return super.on(event, listener);
  }

  /**
   * Type-safe event emitter
   */
  emit<K extends keyof QueueEvents>(event: K, data: QueueEvents[K]): boolean {
    return super.emit(event, data);
  }
}

// Singleton instance
let globalQueueManager: PlatformQueueManager | null = null;

/**
 * Get or create the global queue manager instance
 */
export function getQueueManager(): PlatformQueueManager {
  if (!globalQueueManager) {
    globalQueueManager = new PlatformQueueManager();
  }
  return globalQueueManager;
}

/**
 * Reset the global queue manager (useful for testing)
 */
export function resetGlobalQueueManager(): void {
  if (globalQueueManager) {
    globalQueueManager.clearAllQueues();
    globalQueueManager.removeAllListeners();
  }
  globalQueueManager = null;
}

export default PlatformQueueManager;
