/**
 * Queue Manager Tests
 *
 * @vitest-environment node
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  PlatformQueueManager,
  resetGlobalQueueManager,
  getQueueManager,
} from './queue-manager';
import { PlatformRateLimiter, resetGlobalRateLimiter } from './rate-limiter';
import { QueuedRequest, ProcessResult } from './types';

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('PlatformQueueManager', () => {
  beforeEach(() => {
    resetGlobalRateLimiter();
    resetGlobalQueueManager();
  });

  afterEach(() => {
    // Ensure clean state
    const manager = getQueueManager();
    if (manager) {
      manager.clearAllQueues();
    }
  });

  it('should enqueue requests correctly', async () => {
    const queueManager = new PlatformQueueManager(new PlatformRateLimiter(), {
      autoProcess: false,
    });

    const request = await queueManager.enqueue({
      promptId: 1,
      platform: 'chatgpt',
      prompt: 'Test prompt',
    });

    expect(request.id).toBeDefined();
    expect(request.promptId).toBe(1);
    expect(request.platform).toBe('chatgpt');
    expect(request.status).toBe('pending');
    expect(queueManager.getQueueLength('chatgpt')).toBe(1);
  });

  it('should handle priority correctly', async () => {
    const queueManager = new PlatformQueueManager(new PlatformRateLimiter(), {
      autoProcess: false,
    });

    // Add normal priority requests first
    await queueManager.enqueue({
      promptId: 1,
      platform: 'chatgpt',
      prompt: 'Normal 1',
      priority: 'normal',
    });
    await queueManager.enqueue({
      promptId: 2,
      platform: 'chatgpt',
      prompt: 'Normal 2',
      priority: 'normal',
    });

    // Add high priority request
    const highPriority = await queueManager.enqueue({
      promptId: 3,
      platform: 'chatgpt',
      prompt: 'High priority',
      priority: 'high',
    });

    expect(queueManager.getQueueLength('chatgpt')).toBe(3);

    // Verify the high priority request exists
    const request = queueManager.getRequest(highPriority.id);
    expect(request).toBeDefined();
    expect(request?.priority).toBe('high');
  });

  it('should enforce queue size limit', async () => {
    const queueManager = new PlatformQueueManager(new PlatformRateLimiter(), {
      autoProcess: false,
      maxQueueSize: 2,
    });

    await queueManager.enqueue({
      promptId: 1,
      platform: 'chatgpt',
      prompt: 'Test 1',
    });
    await queueManager.enqueue({
      promptId: 2,
      platform: 'chatgpt',
      prompt: 'Test 2',
    });

    await expect(queueManager.enqueue({
      promptId: 3,
      platform: 'chatgpt',
      prompt: 'Test 3',
    })).rejects.toThrow();
  });

  it('should pause and resume platforms', async () => {
    const queueManager = new PlatformQueueManager(new PlatformRateLimiter(), {
      autoProcess: false,
    });

    expect(queueManager.isPaused('chatgpt')).toBe(false);

    queueManager.pause('chatgpt');
    expect(queueManager.isPaused('chatgpt')).toBe(true);

    queueManager.resume('chatgpt');
    expect(queueManager.isPaused('chatgpt')).toBe(false);
  });

  it('should pause and resume all platforms', async () => {
    const queueManager = new PlatformQueueManager(new PlatformRateLimiter(), {
      autoProcess: false,
    });

    queueManager.pauseAll();

    expect(queueManager.isPaused('chatgpt')).toBe(true);
    expect(queueManager.isPaused('claude')).toBe(true);
    expect(queueManager.isPaused('gemini')).toBe(true);

    queueManager.resumeAll();

    expect(queueManager.isPaused('chatgpt')).toBe(false);
    expect(queueManager.isPaused('claude')).toBe(false);
    expect(queueManager.isPaused('gemini')).toBe(false);
  });

  it('should cancel requests', async () => {
    const queueManager = new PlatformQueueManager(new PlatformRateLimiter(), {
      autoProcess: false,
    });

    const request = await queueManager.enqueue({
      promptId: 1,
      platform: 'chatgpt',
      prompt: 'Test',
    });

    const cancelled = queueManager.cancel(request.id);
    expect(cancelled).toBe(true);
    expect(queueManager.getQueueLength('chatgpt')).toBe(0);

    const cancelledAgain = queueManager.cancel('non-existent');
    expect(cancelledAgain).toBe(false);
  });

  it('should clear queues', async () => {
    const queueManager = new PlatformQueueManager(new PlatformRateLimiter(), {
      autoProcess: false,
    });

    await queueManager.enqueue({
      promptId: 1,
      platform: 'chatgpt',
      prompt: 'Test 1',
    });
    await queueManager.enqueue({
      promptId: 2,
      platform: 'chatgpt',
      prompt: 'Test 2',
    });
    await queueManager.enqueue({
      promptId: 3,
      platform: 'claude',
      prompt: 'Test 3',
    });

    const clearedChatGPT = queueManager.clearQueue('chatgpt');
    expect(clearedChatGPT).toBe(2);
    expect(queueManager.getQueueLength('chatgpt')).toBe(0);
    expect(queueManager.getQueueLength('claude')).toBe(1);

    const clearedAll = queueManager.clearAllQueues();
    expect(clearedAll).toBe(1);
  });

  it('should report correct status', async () => {
    const queueManager = new PlatformQueueManager(new PlatformRateLimiter(), {
      autoProcess: false,
    });

    await queueManager.enqueue({
      promptId: 1,
      platform: 'chatgpt',
      prompt: 'Test 1',
    });
    await queueManager.enqueue({
      promptId: 2,
      platform: 'claude',
      prompt: 'Test 2',
    });

    const status = queueManager.getStatus();
    expect(status.totalPending).toBe(2);
    expect(status.totalProcessing).toBe(0);
    expect(status.platforms.chatgpt.pending).toBe(1);
    expect(status.platforms.claude.pending).toBe(1);
    expect(status.timestamp).toBeInstanceOf(Date);
  });

  it('should process requests with executor', async () => {
    const queueManager = new PlatformQueueManager(new PlatformRateLimiter(), {
      autoProcess: false,
      maxRetries: 0,
    });

    let executedRequest: QueuedRequest | null = null;
    let completedEmitted = false;

    queueManager.setExecutor(async (request: QueuedRequest): Promise<ProcessResult> => {
      executedRequest = request;
      return {
        success: true,
        data: { response: 'Test response' },
        durationMs: 10,
      };
    });

    queueManager.on('completed', ({ request, result }) => {
      completedEmitted = true;
      expect(request.status).toBe('completed');
      expect(result.success).toBe(true);
    });

    await queueManager.enqueue({
      promptId: 1,
      platform: 'chatgpt',
      prompt: 'Test prompt',
    });

    queueManager.triggerProcessing('chatgpt');

    // Wait for processing
    await sleep(100);

    expect(executedRequest).not.toBeNull();
    expect(executedRequest?.promptId).toBe(1);
    expect(completedEmitted).toBe(true);
  });

  it('should handle processing failures', async () => {
    const queueManager = new PlatformQueueManager(new PlatformRateLimiter(), {
      autoProcess: false,
      maxRetries: 0,
    });

    let failedEmitted = false;

    queueManager.setExecutor(async (): Promise<ProcessResult> => {
      return {
        success: false,
        error: 'Test error',
        errorType: 'execution_error',
        durationMs: 10,
      };
    });

    queueManager.on('failed', ({ request, result }) => {
      failedEmitted = true;
      expect(request.status).toBe('failed');
      expect(result.success).toBe(false);
    });

    await queueManager.enqueue({
      promptId: 1,
      platform: 'chatgpt',
      prompt: 'Test',
    });

    queueManager.triggerProcessing('chatgpt');
    await sleep(100);

    expect(failedEmitted).toBe(true);
  });

  it('should retry on timeout', async () => {
    const queueManager = new PlatformQueueManager(new PlatformRateLimiter(), {
      autoProcess: false,
      maxRetries: 2,
      retryDelayMs: 10,
    });

    let attempts = 0;

    queueManager.setExecutor(async (): Promise<ProcessResult> => {
      attempts++;
      if (attempts < 2) {
        return {
          success: false,
          error: 'Timeout',
          errorType: 'timeout',
          durationMs: 10,
        };
      }
      return {
        success: true,
        data: 'Success on retry',
        durationMs: 10,
      };
    });

    await queueManager.enqueue({
      promptId: 1,
      platform: 'chatgpt',
      prompt: 'Test',
    });

    queueManager.triggerProcessing('chatgpt');
    await sleep(500);

    expect(attempts).toBe(2);
  });

  it('should implement singleton pattern', async () => {
    const instance1 = getQueueManager();
    const instance2 = getQueueManager();

    expect(instance1).toBe(instance2);

    resetGlobalQueueManager();

    const instance3 = getQueueManager();
    expect(instance1).not.toBe(instance3);
  });

  it('should emit enqueued event', async () => {
    const queueManager = new PlatformQueueManager(new PlatformRateLimiter(), {
      autoProcess: false,
    });

    let eventFired = false;
    queueManager.on('enqueued', ({ request }) => {
      eventFired = true;
      expect(request.platform).toBe('claude');
    });

    await queueManager.enqueue({
      promptId: 1,
      platform: 'claude',
      prompt: 'Test',
    });

    expect(eventFired).toBe(true);
  });

  it('should emit paused and resumed events', async () => {
    const queueManager = new PlatformQueueManager(new PlatformRateLimiter(), {
      autoProcess: false,
    });

    let pausedFired = false;
    let resumedFired = false;

    queueManager.on('paused', ({ platform }) => {
      pausedFired = true;
      expect(platform).toBe('gemini');
    });

    queueManager.on('resumed', ({ platform }) => {
      resumedFired = true;
      expect(platform).toBe('gemini');
    });

    queueManager.pause('gemini');
    expect(pausedFired).toBe(true);

    queueManager.resume('gemini');
    expect(resumedFired).toBe(true);
  });
});
