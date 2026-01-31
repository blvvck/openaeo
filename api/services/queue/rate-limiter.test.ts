/**
 * Rate Limiter Tests
 *
 * @vitest-environment node
 * Run with: npm test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformRateLimiter, resetGlobalRateLimiter, getRateLimiter } from './rate-limiter';

describe('PlatformRateLimiter', () => {
  beforeEach(() => {
    resetGlobalRateLimiter();
  });

  it('should acquire and release slots successfully', () => {
    const limiter = new PlatformRateLimiter();

    // Should acquire successfully
    const result1 = limiter.acquire('chatgpt');
    expect(result1.acquired).toBe(true);

    // Check status
    const status = limiter.getStatus('chatgpt');
    expect(status.activeCount).toBe(1);
    expect(status.availableSlots).toBe(2); // maxConcurrent=3

    // Release and verify
    limiter.release('chatgpt');
    const statusAfter = limiter.getStatus('chatgpt');
    expect(statusAfter.activeCount).toBe(0);
  });

  it('should enforce concurrent limits', () => {
    const limiter = new PlatformRateLimiter();

    // Perplexity has maxConcurrent: 1
    const result1 = limiter.acquire('perplexity');
    expect(result1.acquired).toBe(true);

    const result2 = limiter.acquire('perplexity');
    expect(result2.acquired).toBe(false);
    expect(result2.reason).toBe('max_concurrent');

    // Release and try again
    limiter.release('perplexity');
    const result3 = limiter.acquire('perplexity');
    expect(result3.acquired).toBe(true);
    limiter.release('perplexity');
  });

  it('should enforce RPM limits', () => {
    // Create limiter with very low RPM for testing
    const limiter = new PlatformRateLimiter([
      { platform: 'chatgpt', maxConcurrent: 10, requestsPerMinute: 3, retryAfterMs: 100 },
    ]);

    // Make 3 requests (at the limit)
    for (let i = 0; i < 3; i++) {
      const result = limiter.acquire('chatgpt');
      expect(result.acquired).toBe(true);
      limiter.release('chatgpt'); // Release immediately
    }

    // 4th request should fail due to RPM
    const result4 = limiter.acquire('chatgpt');
    expect(result4.acquired).toBe(false);
    expect(result4.reason).toBe('rpm_exceeded');
  });

  it('should report correct global status', () => {
    const limiter = new PlatformRateLimiter();

    // Acquire slots on multiple platforms
    limiter.acquire('chatgpt');
    limiter.acquire('chatgpt');
    limiter.acquire('claude');

    const globalStatus = limiter.getGlobalStatus();
    expect(globalStatus.totalActive).toBe(3);
    expect(globalStatus.platforms.length).toBeGreaterThan(0);

    const chatgptStatus = globalStatus.platforms.find(p => p.platform === 'chatgpt');
    expect(chatgptStatus?.activeCount).toBe(2);
  });

  it('should report available platforms', () => {
    const limiter = new PlatformRateLimiter();

    // Block perplexity (maxConcurrent: 1)
    limiter.acquire('perplexity');

    const available = limiter.getAvailablePlatforms();
    expect(available).not.toContain('perplexity');
    expect(available).toContain('chatgpt');

    limiter.release('perplexity');
  });

  it('should implement singleton pattern', () => {
    const limiter1 = getRateLimiter();
    const limiter2 = getRateLimiter();

    expect(limiter1).toBe(limiter2);

    limiter1.acquire('chatgpt');
    const status = limiter2.getStatus('chatgpt');
    expect(status.activeCount).toBe(1);
  });

  it('should update limits dynamically', () => {
    const limiter = new PlatformRateLimiter();

    const original = limiter.getLimits('chatgpt');
    expect(original.maxConcurrent).toBe(3);

    limiter.updateLimits('chatgpt', { maxConcurrent: 5 });

    const updated = limiter.getLimits('chatgpt');
    expect(updated.maxConcurrent).toBe(5);
    expect(updated.requestsPerMinute).toBe(original.requestsPerMinute);
  });
});
