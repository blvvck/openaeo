/**
 * Retry Handler Tests
 *
 * Tests for exponential backoff, error categorization, and retry logic.
 * @vitest-environment node
 * Run with: npm test
 */

import { describe, it, expect } from 'vitest';
import {
  categorizeError,
  isRetryable,
  calculateBackoff,
  calculateBackoffWithSuggestion,
  shouldRetryRequest,
  RetryConfig,
  ErrorCategory,
  delay,
} from './retry-handler';
import { QueuedRequest } from './types';

// =====================================================
// Test Helpers
// =====================================================

function createMockRequest(overrides?: Partial<QueuedRequest>): QueuedRequest {
  return {
    id: 'req_test_123',
    promptId: 1,
    platform: 'chatgpt',
    prompt: 'test prompt',
    addedAt: Date.now(),
    retryCount: 0,
    priority: 'normal',
    status: 'pending',
    ...overrides,
  };
}

describe('Retry Handler', () => {
  describe('categorizeError', () => {
    it('should categorize rate limit (429)', () => {
      const rateLimitError = { status: 429, message: 'Too Many Requests' };
      const rateLimitResult = categorizeError(rateLimitError);
      expect(rateLimitResult.category).toBe('rate_limit');
      expect(rateLimitResult.isRetryable).toBe(true);
    });

    it('should categorize auth errors (401, 403)', () => {
      const authError = { status: 401, message: 'Unauthorized' };
      const authResult = categorizeError(authError);
      expect(authResult.category).toBe('auth_error');
      expect(authResult.isRetryable).toBe(false);

      const forbiddenError = { status: 403, message: 'Forbidden' };
      const forbiddenResult = categorizeError(forbiddenError);
      expect(forbiddenResult.category).toBe('auth_error');
      expect(forbiddenResult.isRetryable).toBe(false);
    });

    it('should categorize quota exceeded (402)', () => {
      const quotaError = { status: 402, message: 'Payment Required' };
      const quotaResult = categorizeError(quotaError);
      expect(quotaResult.category).toBe('quota_exceeded');
      expect(quotaResult.isRetryable).toBe(false);
    });

    it('should categorize model not found (404 with message)', () => {
      const modelError = { status: 404, message: 'Model not found' };
      const modelResult = categorizeError(modelError);
      expect(modelResult.category).toBe('model_not_found');
      expect(modelResult.isRetryable).toBe(false);
    });

    it('should categorize network errors', () => {
      const networkErrors = [
        { code: 'ENOTFOUND', message: 'DNS lookup failed' },
        { code: 'ETIMEDOUT', message: 'Connection timed out' },
        { code: 'ECONNREFUSED', message: 'Connection refused' },
        { code: 'ECONNRESET', message: 'Connection reset' },
      ];
      for (const err of networkErrors) {
        const result = categorizeError(err);
        expect(result.category).toBe('network_error');
        expect(result.isRetryable).toBe(true);
      }
    });

    it('should categorize timeouts', () => {
      const timeoutError = { message: 'Request timeout' };
      const timeoutResult = categorizeError(timeoutError);
      expect(timeoutResult.category).toBe('timeout');
      expect(timeoutResult.isRetryable).toBe(true);
    });

    it('should categorize server errors (500)', () => {
      const serverError = { status: 500, message: 'Internal Server Error' };
      const serverResult = categorizeError(serverError);
      expect(serverResult.category).toBe('unknown'); // 500 falls back to unknown/retryable
      expect(serverResult.isRetryable).toBe(true);
    });

    it('should categorize unknown/null errors', () => {
      const unknownError = { message: 'Something went wrong' };
      const unknownResult = categorizeError(unknownError);
      expect(unknownResult.category).toBe('unknown');
      expect(unknownResult.isRetryable).toBe(true);

      const nullResult = categorizeError(null);
      expect(nullResult.category).toBe('unknown');
      expect(nullResult.isRetryable).toBe(true);
    });
  });

  describe('isRetryable', () => {
    it('should identify retryable categories', () => {
      const retryable: ErrorCategory[] = ['rate_limit', 'network_error', 'timeout', 'unknown'];
      for (const category of retryable) {
        expect(isRetryable(category)).toBe(true);
      }
    });

    it('should identify non-retryable categories', () => {
      const nonRetryable: ErrorCategory[] = ['auth_error', 'quota_exceeded', 'model_not_found'];
      for (const category of nonRetryable) {
        expect(isRetryable(category)).toBe(false);
      }
    });
  });

  describe('calculateBackoff', () => {
    it('should output exponential backoff', () => {
      const config: RetryConfig = {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 8000,
        jitterFactor: 0,
      };

      expect(calculateBackoff(0, config)).toBe(1000);
      expect(calculateBackoff(1, config)).toBe(2000);
      expect(calculateBackoff(2, config)).toBe(4000);
      expect(calculateBackoff(3, config)).toBe(8000);
    });

    it('should cap at maxDelayMs', () => {
      const config: RetryConfig = {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 8000,
        jitterFactor: 0,
      };

      expect(calculateBackoff(4, config)).toBe(8000);
      expect(calculateBackoff(5, config)).toBe(8000);
      expect(calculateBackoff(10, config)).toBe(8000);
    });

    it('should apply jitter correctly', () => {
      const config: RetryConfig = {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 8000,
        jitterFactor: 0.1,
      };

      const results = new Set<number>();
      for (let i = 0; i < 100; i++) {
        results.add(calculateBackoff(0, config));
      }

      // Check range and variation
      results.forEach(result => {
        expect(result).toBeGreaterThanOrEqual(1000);
        expect(result).toBeLessThanOrEqual(1100);
      });
      expect(results.size).toBeGreaterThan(1);
    });

    it('should use default config', () => {
      const result = calculateBackoff(0);
      expect(result).toBeGreaterThanOrEqual(1000);
      expect(result).toBeLessThanOrEqual(1100); // 1000 + 0.1 jitter
    });
  });

  describe('calculateBackoffWithSuggestion', () => {
    it('should respect suggested delay', () => {
      const config: RetryConfig = {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 8000,
        jitterFactor: 0,
      };

      // Suggested > Calculated
      expect(calculateBackoffWithSuggestion(0, 5000, config)).toBe(5000);

      // Calculated > Suggested
      expect(calculateBackoffWithSuggestion(2, 1000, config)).toBe(4000);

      // No suggestion
      expect(calculateBackoffWithSuggestion(1, undefined, config)).toBe(2000);
    });
  });

  describe('shouldRetryRequest', () => {
    it('should decide logic correctly', () => {
      const config: RetryConfig = {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 8000,
        jitterFactor: 0,
      };

      // Rate limit should retry
      const rateLimitRequest = createMockRequest({ retryCount: 0 });
      const rateLimitError = { status: 429, message: 'Too Many Requests' };
      const rateLimitDecision = shouldRetryRequest(rateLimitRequest, rateLimitError, config);
      expect(rateLimitDecision.shouldRetry).toBe(true);
      expect(rateLimitDecision.delayMs).toBe(1000);
      expect(rateLimitDecision.errorClassification.category).toBe('rate_limit');

      // Network error should retry (check retry count logic)
      const networkRequest = createMockRequest({ retryCount: 1 });
      const networkError = { code: 'ECONNRESET', message: 'Connection reset' };
      const networkDecision = shouldRetryRequest(networkRequest, networkError, config);
      expect(networkDecision.shouldRetry).toBe(true);
      expect(networkDecision.delayMs).toBe(2000);

      // Auth error -> no retry
      const authRequest = createMockRequest({ retryCount: 0 });
      const authError = { status: 401, message: 'Unauthorized' };
      const authDecision = shouldRetryRequest(authRequest, authError, config);
      expect(authDecision.shouldRetry).toBe(false);
      expect(authDecision.reason).toMatch(/Non-retryable/);

      // Max retries reached -> no retry
      const maxRetriesRequest = createMockRequest({ retryCount: 3 });
      const maxRetriesError = { status: 429, message: 'Too Many Requests' };
      const maxRetriesDecision = shouldRetryRequest(maxRetriesRequest, maxRetriesError, config);
      expect(maxRetriesDecision.shouldRetry).toBe(false);
      expect(maxRetriesDecision.reason).toMatch(/Max retries/);
    });

    it('should follow backoff progression', () => {
      const config: RetryConfig = {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 8000,
        jitterFactor: 0,
      };

      const delays: number[] = [];
      for (let retryCount = 0; retryCount < 4; retryCount++) {
        const request = createMockRequest({ retryCount });
        const error = { status: 429, message: 'Too Many Requests' };
        const decision = shouldRetryRequest(request, error, config);
        if (decision.shouldRetry && decision.delayMs) {
          delays.push(decision.delayMs);
        }
      }
      expect(delays).toEqual([1000, 2000, 4000]);
    });
  });

  describe('delay', () => {
    it('should wait for specified duration', async () => {
      const start = Date.now();
      await delay(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(90);
    });
  });
});
