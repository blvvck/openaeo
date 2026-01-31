/**
 * Platform Rate Limiter
 *
 * Enforces per-platform API rate limits using:
 * - Concurrent request tracking (semaphore-style)
 * - Sliding window algorithm for requests-per-minute
 *
 * Thread-safe for Node.js single-threaded async operations.
 */

import { PlatformName } from '../platforms/types';
import {
  PlatformLimits,
  RateLimitStatus,
  AcquireResult,
  GlobalRateLimitStatus,
  DEFAULT_PLATFORM_LIMITS,
} from './types';

export class PlatformRateLimiter {
  private readonly limits: Map<PlatformName, PlatformLimits>;
  private readonly activeCount: Map<PlatformName, number>;
  private readonly requestTimestamps: Map<PlatformName, number[]>;

  constructor(customLimits?: PlatformLimits[]) {
    this.limits = new Map();
    this.activeCount = new Map();
    this.requestTimestamps = new Map();

    // Initialize with default limits
    const limitsToUse = customLimits ?? DEFAULT_PLATFORM_LIMITS;
    for (const limit of limitsToUse) {
      this.limits.set(limit.platform, limit);
      this.activeCount.set(limit.platform, 0);
      this.requestTimestamps.set(limit.platform, []);
    }
  }

  /**
   * Get configured limits for a platform
   */
  getLimits(platform: PlatformName): PlatformLimits {
    const limits = this.limits.get(platform);
    if (!limits) {
      // Return conservative defaults for unknown platforms
      return {
        platform,
        maxConcurrent: 1,
        requestsPerMinute: 10,
        retryAfterMs: 5000,
      };
    }
    return limits;
  }

  /**
   * Attempt to acquire a slot for making a request to a platform.
   * Returns true if acquired, false if rate limited.
   *
   * IMPORTANT: Always call release() when the request completes!
   */
  acquire(platform: PlatformName): AcquireResult {
    const limits = this.getLimits(platform);
    const now = Date.now();

    // Check concurrent limit first (most common blocker)
    const active = this.activeCount.get(platform) ?? 0;
    if (active >= limits.maxConcurrent) {
      return {
        acquired: false,
        reason: 'max_concurrent',
        retryAfterMs: limits.retryAfterMs,
      };
    }

    // Check RPM limit with sliding window
    const timestamps = this.requestTimestamps.get(platform) ?? [];
    const windowStart = now - 60_000; // 1 minute ago
    const recentTimestamps = timestamps.filter(t => t > windowStart);

    if (recentTimestamps.length >= limits.requestsPerMinute) {
      // Calculate when the oldest request will expire from the window
      const oldestTimestamp = Math.min(...recentTimestamps);
      const availableInMs = oldestTimestamp + 60_000 - now;

      return {
        acquired: false,
        reason: 'rpm_exceeded',
        retryAfterMs: Math.max(limits.retryAfterMs, availableInMs),
      };
    }

    // Acquire the slot
    this.activeCount.set(platform, active + 1);
    this.requestTimestamps.set(platform, [...recentTimestamps, now]);

    return { acquired: true };
  }

  /**
   * Release a slot after a request completes.
   * Call this in a finally block to ensure proper cleanup.
   */
  release(platform: PlatformName): void {
    const active = this.activeCount.get(platform) ?? 0;
    this.activeCount.set(platform, Math.max(0, active - 1));
  }

  /**
   * Wait until a slot becomes available, then acquire it.
   * Uses exponential backoff to avoid busy waiting.
   *
   * @param maxWaitMs Maximum time to wait (default: 30 seconds)
   * @returns true if acquired, false if timeout
   */
  async waitAndAcquire(
    platform: PlatformName,
    maxWaitMs: number = 30_000
  ): Promise<boolean> {
    const startTime = Date.now();
    const limits = this.getLimits(platform);
    let delay = limits.retryAfterMs;
    const maxDelay = 5000; // Cap at 5 seconds between attempts

    while (Date.now() - startTime < maxWaitMs) {
      const result = this.acquire(platform);
      if (result.acquired) {
        return true;
      }

      // Wait before retrying
      const waitTime = Math.min(delay, result.retryAfterMs ?? delay);
      await this.sleep(waitTime);

      // Exponential backoff with jitter
      delay = Math.min(delay * 1.5 + Math.random() * 100, maxDelay);
    }

    return false;
  }

  /**
   * Get current rate limit status for a platform
   */
  getStatus(platform: PlatformName): RateLimitStatus {
    const limits = this.getLimits(platform);
    const active = this.activeCount.get(platform) ?? 0;
    const now = Date.now();
    const windowStart = now - 60_000;
    const timestamps = this.requestTimestamps.get(platform) ?? [];
    const recentTimestamps = timestamps.filter(t => t > windowStart);
    const requestsInWindow = recentTimestamps.length;

    const isLimited =
      active >= limits.maxConcurrent ||
      requestsInWindow >= limits.requestsPerMinute;

    let availableInMs: number | undefined;
    if (isLimited && recentTimestamps.length > 0) {
      const oldestTimestamp = Math.min(...recentTimestamps);
      availableInMs = Math.max(0, oldestTimestamp + 60_000 - now);
    }

    return {
      platform,
      activeCount: active,
      availableSlots: Math.max(0, limits.maxConcurrent - active),
      requestsInWindow,
      isLimited,
      availableInMs,
    };
  }

  /**
   * Get global status across all platforms
   */
  getGlobalStatus(): GlobalRateLimitStatus {
    const platforms: RateLimitStatus[] = [];
    let totalActive = 0;

    for (const platform of Array.from(this.limits.keys())) {
      const status = this.getStatus(platform);
      platforms.push(status);
      totalActive += status.activeCount;
    }

    return {
      platforms,
      totalActive,
      timestamp: new Date(),
    };
  }

  /**
   * Check if a platform has available capacity
   */
  hasCapacity(platform: PlatformName): boolean {
    const status = this.getStatus(platform);
    return !status.isLimited;
  }

  /**
   * Get all platforms with available capacity, sorted by available slots
   */
  getAvailablePlatforms(): PlatformName[] {
    return Array.from(this.limits.keys())
      .filter(p => this.hasCapacity(p))
      .sort((a, b) => {
        const statusA = this.getStatus(a);
        const statusB = this.getStatus(b);
        return statusB.availableSlots - statusA.availableSlots;
      });
  }

  /**
   * Clean up old timestamps to prevent memory growth.
   * Called automatically but can be triggered manually.
   */
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - 60_000;

    for (const [platform, timestamps] of Array.from(this.requestTimestamps.entries())) {
      const recentTimestamps = timestamps.filter(t => t > windowStart);
      this.requestTimestamps.set(platform, recentTimestamps);
    }
  }

  /**
   * Reset all rate limit state (useful for testing)
   */
  reset(): void {
    for (const platform of Array.from(this.limits.keys())) {
      this.activeCount.set(platform, 0);
      this.requestTimestamps.set(platform, []);
    }
  }

  /**
   * Update limits for a specific platform at runtime
   */
  updateLimits(platform: PlatformName, newLimits: Partial<PlatformLimits>): void {
    const current = this.getLimits(platform);
    this.limits.set(platform, { ...current, ...newLimits, platform });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance for application-wide rate limiting
let globalRateLimiter: PlatformRateLimiter | null = null;

/**
 * Get or create the global rate limiter instance
 */
export function getRateLimiter(): PlatformRateLimiter {
  if (!globalRateLimiter) {
    globalRateLimiter = new PlatformRateLimiter();
  }
  return globalRateLimiter;
}

/**
 * Reset the global rate limiter (useful for testing)
 */
export function resetGlobalRateLimiter(): void {
  globalRateLimiter = null;
}

export default PlatformRateLimiter;
