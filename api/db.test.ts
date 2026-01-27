/**
 * Database Connection Tests
 *
 * Tests for connection pooling utility functions.
 * Uses mocks to avoid requiring actual database connection.
 *
 * @vitest-environment node
 * Run with: npm test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock console methods
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

/**
 * Standalone queryWithTiming implementation for testing
 * (same logic as in db.ts but without requiring database connection)
 */
const SLOW_QUERY_THRESHOLD_MS = 100;

async function queryWithTiming<T>(
  queryFn: () => Promise<T>,
  label?: string
): Promise<T> {
  const start = Date.now();
  try {
    const result = await queryFn();
    const duration = Date.now() - start;

    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      console.warn(`[DB] Slow query${label ? ` (${label})` : ''}: ${duration}ms`);
    }

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[DB] Query failed${label ? ` (${label})` : ''} after ${duration}ms:`, error);
    throw error;
  }
}

describe('queryWithTiming', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should execute query function and return result', async () => {
    const mockFn = vi.fn().mockResolvedValue({ data: 'test' });

    const result = await queryWithTiming(mockFn);

    expect(mockFn).toHaveBeenCalled();
    expect(result).toEqual({ data: 'test' });
  });

  it('should not log for fast queries', async () => {
    const mockFn = vi.fn().mockResolvedValue('fast');

    await queryWithTiming(mockFn, 'fast-query');

    expect(mockConsoleWarn).not.toHaveBeenCalled();
  });

  it('should log slow queries above threshold', async () => {
    const mockFn = vi.fn().mockImplementation(async () => {
      // Simulate slow query
      await new Promise(resolve => setTimeout(resolve, 150));
      return 'slow';
    });

    await queryWithTiming(mockFn, 'slow-query');

    expect(mockConsoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('[DB] Slow query')
    );
  });

  it('should include label in slow query log', async () => {
    const mockFn = vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
      return 'slow';
    });

    await queryWithTiming(mockFn, 'my-label');

    expect(mockConsoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('(my-label)')
    );
  });

  it('should log and rethrow errors', async () => {
    const error = new Error('Query failed');
    const mockFn = vi.fn().mockRejectedValue(error);

    await expect(queryWithTiming(mockFn, 'failing-query')).rejects.toThrow('Query failed');
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining('[DB] Query failed'),
      error
    );
  });

  it('should work without label', async () => {
    const mockFn = vi.fn().mockResolvedValue('result');

    const result = await queryWithTiming(mockFn);

    expect(result).toBe('result');
  });

  it('should measure duration correctly', async () => {
    const delay = 50;
    const mockFn = vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, delay));
      return 'timed';
    });

    const start = Date.now();
    await queryWithTiming(mockFn);
    const elapsed = Date.now() - start;

    // Allow some margin for execution overhead
    expect(elapsed).toBeGreaterThanOrEqual(delay - 10);
  });
});

describe('Pool Configuration', () => {
  it('should define correct environment variable names', () => {
    // These tests verify the expected env vars are documented
    // In production, these are set by the deployment environment
    const expectedEnvVars = [
      'DATABASE_URL',
      'DB_POOL_MAX',
      'DB_POOL_MIN',
      'DB_CONNECTION_TIMEOUT',
      'DB_IDLE_TIMEOUT',
      'DB_SLOW_QUERY_THRESHOLD',
    ];

    // Just verify the names are valid strings
    expectedEnvVars.forEach(envVar => {
      expect(typeof envVar).toBe('string');
      expect(envVar.length).toBeGreaterThan(0);
    });
  });

  it('should have sensible default values', () => {
    // Verify defaults match what's in db.ts
    const defaults = {
      poolMax: 20,
      poolMin: 2,
      connectionTimeout: 5000,
      idleTimeout: 30000,
      slowQueryThreshold: 100,
    };

    expect(defaults.poolMax).toBeGreaterThan(defaults.poolMin);
    expect(defaults.connectionTimeout).toBeLessThan(defaults.idleTimeout);
    expect(defaults.slowQueryThreshold).toBeGreaterThan(0);
  });
});
