/**
 * Queue Repository Tests
 *
 * Tests for the queue persistence layer structure.
 *
 * NOTE: Integration tests require DATABASE_URL to be set.
 * Unit tests below verify the module structure and exports.
 *
 * @vitest-environment node
 * Run with: npm test
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Queue Repository Structure', () => {
  it('should export QueueRepository type from index', () => {
    const indexPath = path.join(process.cwd(), 'api/services/queue/index.ts');
    const content = fs.readFileSync(indexPath, 'utf-8');
    expect(content).toContain('QueueRepository');
  });

  it('should export getQueueRepository from index', () => {
    const indexPath = path.join(process.cwd(), 'api/services/queue/index.ts');
    const content = fs.readFileSync(indexPath, 'utf-8');
    expect(content).toContain('getQueueRepository');
  });

  it('should export resetGlobalQueueRepository from index', () => {
    const indexPath = path.join(process.cwd(), 'api/services/queue/index.ts');
    const content = fs.readFileSync(indexPath, 'utf-8');
    expect(content).toContain('resetGlobalQueueRepository');
  });

  it('should export QueueStats type from index', () => {
    const indexPath = path.join(process.cwd(), 'api/services/queue/index.ts');
    const content = fs.readFileSync(indexPath, 'utf-8');
    expect(content).toContain('QueueStats');
  });

  it('should export QueueItemStatus type from index', () => {
    const indexPath = path.join(process.cwd(), 'api/services/queue/index.ts');
    const content = fs.readFileSync(indexPath, 'utf-8');
    expect(content).toContain('QueueItemStatus');
  });

  it('should export QueueQueryOptions type from index', () => {
    const indexPath = path.join(process.cwd(), 'api/services/queue/index.ts');
    const content = fs.readFileSync(indexPath, 'utf-8');
    expect(content).toContain('QueueQueryOptions');
  });

  it('should have required methods in repository file', () => {
    const repoPath = path.join(process.cwd(), 'api/services/queue/queue-repository.ts');
    const content = fs.readFileSync(repoPath, 'utf-8');

    expect(content).toContain('async create(');
    expect(content).toContain('async createMany(');
    expect(content).toContain('async getById(');
    expect(content).toContain('async getPending(');
    expect(content).toContain('async getReadyToProcess(');
    expect(content).toContain('async markProcessing(');
    expect(content).toContain('async markCompleted(');
    expect(content).toContain('async markFailed(');
    expect(content).toContain('async incrementRetry(');
    expect(content).toContain('async resetForRetry(');
    expect(content).toContain('async delete(');
    expect(content).toContain('async cleanupOld(');
    expect(content).toContain('async getStats(');
    expect(content).toContain('async countByStatus(');
    expect(content).toContain('async resetStaleProcessing(');
  });

  it('should have required schema definitions', () => {
    const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
    const content = fs.readFileSync(schemaPath, 'utf-8');

    const model = content.match(/model request_queue \{[\s\S]*?\n\}/)?.[0];
    expect(model).toBeDefined();
    expect(model).toContain('id            Int       @id @default(autoincrement())');
    expect(model).toContain('workspace_id  String    @db.Uuid');
    expect(model).toContain('prompt_id     Int?');
    expect(model).toContain('platform      String');
    expect(model).toContain('status        String?');
    expect(model).toContain('retry_count   Int?');
    expect(model).toContain('error_message String?');
    expect(model).toContain('@@index([status, platform], map: "idx_queue_status_platform")');
  });
});
