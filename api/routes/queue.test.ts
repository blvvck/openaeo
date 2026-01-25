/**
 * Queue Status API Tests
 *
 * Tests for the queue status API endpoints.
 * These tests verify the route structure and response format.
 *
 * @vitest-environment node
 * Run with: npm test
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Queue Status API Structure', () => {
  const routesPath = path.join(process.cwd(), 'api/routes.ts');
  const routesContent = fs.readFileSync(routesPath, 'utf-8');

  it('should import required queue modules', () => {
    expect(routesContent).toContain('getQueueManager');
    expect(routesContent).toContain('getRateLimiter');
    expect(routesContent).toContain('getQueueRepository');
  });

  describe('GET /api/queue/status', () => {
    it('should have endpoint definition', () => {
      expect(routesContent).toContain('app.get("/api/queue/status"');
    });

    it('should return overall counts', () => {
      expect(routesContent).toContain('overall:');
      expect(routesContent).toContain('pending:');
      // Check for running or processing
      expect(routesContent).toSatisfy((c: string) => c.includes('running:') || c.includes('processing:'));
      expect(routesContent).toContain('completed:');
      expect(routesContent).toContain('failed:');
    });

    it('should return details', () => {
      expect(routesContent).toContain('progressPercent');
      expect(routesContent).toContain('platforms:');
      expect(routesContent).toContain('estimatedTimeRemaining');
      expect(routesContent).toContain("timestamp: new Date().toISOString()");
    });

    it('should return status', () => {
      expect(routesContent).toContain("'idle'");
      expect(routesContent).toContain("'processing'");
      expect(routesContent).toContain("'paused'");
    });

    it('should include rate limit info', () => {
      expect(routesContent).toContain('rateLimit:');
      expect(routesContent).toContain('rateLimit.activeCount');
      expect(routesContent).toContain('rateLimit.availableSlots');
      expect(routesContent).toContain('rateLimit.isLimited');
    });

    it('should handle errors', () => {
      expect(routesContent).toContain('"Failed to fetch queue status"');
    });
  });

  describe('POST /api/queue/retry/:id', () => {
    it('should have endpoint definition', () => {
      expect(routesContent).toContain('app.post("/api/queue/retry/:id"');
    });

    it('should implement retry logic', () => {
      expect(routesContent).toContain('isNaN(queueId)');
      expect(routesContent).toContain("Queue item not found");
      expect(routesContent).toContain("Can only retry failed items");
      expect(routesContent).toContain('resetForRetry');
      expect(routesContent).toContain('triggerProcessing');
    });

    it('should handle errors', () => {
      expect(routesContent).toContain('"Failed to retry queue item"');
    });
  });

  describe('POST /api/queue/pause', () => {
    it('should have endpoint definition', () => {
      expect(routesContent).toContain('app.post("/api/queue/pause');
    });

    it('should call pause/pauseAll', () => {
      expect(routesContent).toContain('queueManager.pause(');
      expect(routesContent).toContain('queueManager.pauseAll()');
    });

    it('should handle errors', () => {
      expect(routesContent).toContain('"Failed to pause queue"');
    });
  });

  describe('POST /api/queue/resume', () => {
    it('should have endpoint definition', () => {
      expect(routesContent).toContain('app.post("/api/queue/resume');
    });

    it('should call resume/resumeAll', () => {
      expect(routesContent).toContain('queueManager.resume(');
      expect(routesContent).toContain('queueManager.resumeAll()');
    });

    it('should handle errors', () => {
      expect(routesContent).toContain('"Failed to resume queue"');
    });
  });

  describe('DELETE /api/queue/clear', () => {
    it('should have endpoint definition', () => {
      expect(routesContent).toContain('app.delete("/api/queue/clear');
    });

    it('should call clearQueue/clearAllQueues', () => {
      expect(routesContent).toContain('clearQueue');
      expect(routesContent).toContain('clearAllQueues');
    });

    it('should handle errors', () => {
      expect(routesContent).toContain('"Failed to clear queue"');
    });
  });

  describe('POST /api/queue/cleanup', () => {
    it('should have endpoint definition', () => {
      expect(routesContent).toContain('app.post("/api/queue/cleanup"');
    });

    it('should implement cleanup logic', () => {
      expect(routesContent).toContain('olderThanDays');
      expect(routesContent).toContain('cleanupOld');
      expect(routesContent).toContain('deletedCount');
    });

    it('should handle errors', () => {
      expect(routesContent).toContain('"Failed to clean up queue"');
    });
  });
});
