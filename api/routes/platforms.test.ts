

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import platformsRoutes from './platforms';

// Mock the platform service
const mockPlatforms = [
  {
    id: 'uuid-1',
    slug: 'chatgpt',
    name: 'ChatGPT',
    iconUrl: null,
    isActive: true,
    rateLimitRpm: 60,
    rateLimitConcurrent: 5,
    createdAt: new Date(),
  },
  {
    id: 'uuid-2',
    slug: 'claude',
    name: 'Claude',
    iconUrl: null,
    isActive: true,
    rateLimitRpm: 50,
    rateLimitConcurrent: 3,
    createdAt: new Date(),
  },
  {
    id: 'uuid-3',
    slug: 'gemini',
    name: 'Gemini',
    iconUrl: null,
    isActive: false,
    rateLimitRpm: 40,
    rateLimitConcurrent: 2,
    createdAt: new Date(),
  },
];

vi.mock('../services/platforms/platform-service', () => ({
  getPlatformService: vi.fn(() => ({
    getAll: vi.fn(() => Promise.resolve(mockPlatforms)),
    getActive: vi.fn(() => Promise.resolve(mockPlatforms.filter(p => p.isActive))),
    getById: vi.fn((id: string) => Promise.resolve(mockPlatforms.find(p => p.id === id))),
    getBySlug: vi.fn((slug: string) => Promise.resolve(mockPlatforms.find(p => p.slug === slug))),
    create: vi.fn((input: any) => {
      if (input.slug === 'existing-slug') {
        return Promise.reject(new Error('Platform with slug "existing-slug" already exists'));
      }
      return Promise.resolve({
        id: 'uuid-new',
        ...input,
        createdAt: new Date(),
      });
    }),
    update: vi.fn((id: string, input: any) => {
      const platform = mockPlatforms.find(p => p.id === id);
      if (!platform) return Promise.resolve(undefined);
      return Promise.resolve({ ...platform, ...input });
    }),
    delete: vi.fn((id: string) => {
      const exists = mockPlatforms.find(p => p.id === id);
      return Promise.resolve(!!exists);
    }),
    toggleActive: vi.fn((id: string) => {
      const platform = mockPlatforms.find(p => p.id === id);
      if (!platform) return Promise.resolve(undefined);
      return Promise.resolve({ ...platform, isActive: !platform.isActive });
    }),
    updateRateLimits: vi.fn((id: string, rpm: number, concurrent: number) => {
      const platform = mockPlatforms.find(p => p.id === id);
      if (!platform) return Promise.resolve(undefined);
      if (rpm < 1 || rpm > 10000) {
        return Promise.reject(new Error('RPM must be between 1 and 10000'));
      }
      if (concurrent < 1 || concurrent > 100) {
        return Promise.reject(new Error('Concurrent limit must be between 1 and 100'));
      }
      return Promise.resolve({ ...platform, rateLimitRpm: rpm, rateLimitConcurrent: concurrent });
    }),
    getStats: vi.fn(() => Promise.resolve({
      total: 3,
      active: 2,
      inactive: 1,
      byType: { chatgpt: 1, claude: 1, gemini: 1 },
    })),
  })),
}));

// Create Express app for testing
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/platforms', platformsRoutes);
  return app;
}

describe('Platforms API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createApp();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/platforms', () => {
    it('should return all platforms', async () => {
      const res = await request(app).get('/api/platforms');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(3);
      expect(res.body[0].slug).toBe('chatgpt');
    });

    it('should return 200 for empty list', async () => {
      const { getPlatformService } = await import('../services/platforms/platform-service');
      (getPlatformService as any).mockReturnValue({
        getAll: vi.fn(() => Promise.resolve([])),
      });

      const res = await request(app).get('/api/platforms');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /api/platforms/active', () => {
    it('should return only active platforms', async () => {
      const res = await request(app).get('/api/platforms/active');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body.every((p: any) => p.isActive)).toBe(true);
    });
  });

  describe('GET /api/platforms/stats', () => {
    it('should return platform statistics', async () => {
      const res = await request(app).get('/api/platforms/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        total: 3,
        active: 2,
        inactive: 1,
        byType: { chatgpt: 1, claude: 1, gemini: 1 },
      });
    });
  });

  describe('GET /api/platforms/by-slug/:slug', () => {
    it('should return platform by slug', async () => {
      const res = await request(app).get('/api/platforms/by-slug/chatgpt');
      expect(res.status).toBe(200);
      expect(res.body.slug).toBe('chatgpt');
    });

    it('should return 404 for non-existent slug', async () => {
      const res = await request(app).get('/api/platforms/by-slug/non-existent');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Platform not found');
    });
  });

  describe('GET /api/platforms/:id', () => {
    it('should return platform by ID', async () => {
      const res = await request(app).get('/api/platforms/uuid-1');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('uuid-1');
    });

    it('should return 404 for non-existent ID', async () => {
      const res = await request(app).get('/api/platforms/non-existent');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Platform not found');
    });
  });

  describe('POST /api/platforms', () => {
    it('should create a new platform', async () => {
      const res = await request(app)
        .post('/api/platforms')
        .send({
          slug: 'new-platform',
          name: 'New Platform',
          rateLimitRpm: 60,
          rateLimitConcurrent: 5,
        });

      expect(res.status).toBe(201);
      expect(res.body.slug).toBe('new-platform');
    });

    it('should return 400 for missing slug', async () => {
      const res = await request(app)
        .post('/api/platforms')
        .send({
          name: 'New Platform',
          rateLimitRpm: 60,
          rateLimitConcurrent: 5,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should return 400 for invalid slug format', async () => {
      const res = await request(app)
        .post('/api/platforms')
        .send({
          slug: 'invalid_slug!',
          name: 'New Platform',
          rateLimitRpm: 60,
          rateLimitConcurrent: 5,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should return 400 for missing name', async () => {
      const res = await request(app)
        .post('/api/platforms')
        .send({
          slug: 'new-platform',
          rateLimitRpm: 60,
          rateLimitConcurrent: 5,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should return 400 for invalid RPM', async () => {
      const res = await request(app)
        .post('/api/platforms')
        .send({
          slug: 'new-platform',
          name: 'New Platform',
          rateLimitRpm: 0,
          rateLimitConcurrent: 5,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should return 400 for invalid concurrent limit', async () => {
      const res = await request(app)
        .post('/api/platforms')
        .send({
          slug: 'new-platform',
          name: 'New Platform',
          rateLimitRpm: 60,
          rateLimitConcurrent: 0,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should return 409 for duplicate slug', async () => {
      const res = await request(app)
        .post('/api/platforms')
        .send({
          slug: 'existing-slug',
          name: 'Duplicate Platform',
          rateLimitRpm: 60,
          rateLimitConcurrent: 5,
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already exists');
    });

    it('should accept optional isActive field', async () => {
      const res = await request(app)
        .post('/api/platforms')
        .send({
          slug: 'optional-active',
          name: 'Optional Active Platform',
          rateLimitRpm: 60,
          rateLimitConcurrent: 5,
          isActive: false,
        });

      expect(res.status).toBe(201);
    });

    it('should accept optional iconUrl field', async () => {
      const res = await request(app)
        .post('/api/platforms')
        .send({
          slug: 'with-icon',
          name: 'Platform with Icon',
          rateLimitRpm: 60,
          rateLimitConcurrent: 5,
          iconUrl: 'https://example.com/icon.png',
        });

      expect(res.status).toBe(201);
    });
  });

  describe('PUT /api/platforms/:id', () => {
    it('should update a platform', async () => {
      const res = await request(app)
        .put('/api/platforms/uuid-1')
        .send({
          name: 'Updated Name',
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Name');
    });

    it('should return 404 for non-existent platform', async () => {
      const res = await request(app)
        .put('/api/platforms/non-existent')
        .send({
          name: 'Updated Name',
        });

      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid name', async () => {
      const res = await request(app)
        .put('/api/platforms/uuid-1')
        .send({
          name: '',
        });

      expect(res.status).toBe(400);
    });

    it('should allow partial updates', async () => {
      const res = await request(app)
        .put('/api/platforms/uuid-1')
        .send({
          isActive: false,
        });

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/platforms/:id', () => {
    it('should delete a platform', async () => {
      const res = await request(app).delete('/api/platforms/uuid-1');
      expect(res.status).toBe(204);
    });

    it('should return 404 for non-existent platform', async () => {
      const res = await request(app).delete('/api/platforms/non-existent');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/platforms/:id/toggle', () => {
    it('should toggle platform active status', async () => {
      const res = await request(app).patch('/api/platforms/uuid-1/toggle');
      expect(res.status).toBe(200);
      expect(res.body.isActive).toBe(false); // Toggled from true
    });

    it('should return 404 for non-existent platform', async () => {
      const res = await request(app).patch('/api/platforms/non-existent/toggle');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/platforms/:id/rate-limits', () => {
    it('should update rate limits', async () => {
      const res = await request(app)
        .patch('/api/platforms/uuid-1/rate-limits')
        .send({
          rateLimitRpm: 100,
          rateLimitConcurrent: 10,
        });

      expect(res.status).toBe(200);
      expect(res.body.rateLimitRpm).toBe(100);
      expect(res.body.rateLimitConcurrent).toBe(10);
    });

    it('should return 404 for non-existent platform', async () => {
      const res = await request(app)
        .patch('/api/platforms/non-existent/rate-limits')
        .send({
          rateLimitRpm: 100,
          rateLimitConcurrent: 10,
        });

      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid RPM', async () => {
      const res = await request(app)
        .patch('/api/platforms/uuid-1/rate-limits')
        .send({
          rateLimitRpm: 0,
          rateLimitConcurrent: 10,
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid concurrent limit', async () => {
      const res = await request(app)
        .patch('/api/platforms/uuid-1/rate-limits')
        .send({
          rateLimitRpm: 100,
          rateLimitConcurrent: 0,
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 for missing fields', async () => {
      const res = await request(app)
        .patch('/api/platforms/uuid-1/rate-limits')
        .send({
          rateLimitRpm: 100,
        });

      expect(res.status).toBe(400);
    });
  });
});

describe('Validation Edge Cases', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createApp();
  });

  it('should reject slug at boundary + 1', async () => {
    const res = await request(app)
      .post('/api/platforms')
      .send({
        slug: 'a'.repeat(51),
        name: 'Test',
        rateLimitRpm: 60,
        rateLimitConcurrent: 5,
      });

    expect(res.status).toBe(400);
  });

  it('should accept slug at boundary', async () => {
    const res = await request(app)
      .post('/api/platforms')
      .send({
        slug: 'a'.repeat(50),
        name: 'Test',
        rateLimitRpm: 60,
        rateLimitConcurrent: 5,
      });

    expect(res.status).toBe(201);
  });

  it('should reject name at boundary + 1', async () => {
    const res = await request(app)
      .post('/api/platforms')
      .send({
        slug: 'test',
        name: 'a'.repeat(101),
        rateLimitRpm: 60,
        rateLimitConcurrent: 5,
      });

    expect(res.status).toBe(400);
  });

  it('should accept name at boundary', async () => {
    const res = await request(app)
      .post('/api/platforms')
      .send({
        slug: 'test',
        name: 'a'.repeat(100),
        rateLimitRpm: 60,
        rateLimitConcurrent: 5,
      });

    expect(res.status).toBe(201);
  });

  it('should reject RPM at boundary + 1', async () => {
    const res = await request(app)
      .post('/api/platforms')
      .send({
        slug: 'test',
        name: 'Test',
        rateLimitRpm: 10001,
        rateLimitConcurrent: 5,
      });

    expect(res.status).toBe(400);
  });

  it('should accept RPM at boundary', async () => {
    const res = await request(app)
      .post('/api/platforms')
      .send({
        slug: 'test',
        name: 'Test',
        rateLimitRpm: 10000,
        rateLimitConcurrent: 5,
      });

    expect(res.status).toBe(201);
  });

  it('should reject concurrent at boundary + 1', async () => {
    const res = await request(app)
      .post('/api/platforms')
      .send({
        slug: 'test',
        name: 'Test',
        rateLimitRpm: 60,
        rateLimitConcurrent: 101,
      });

    expect(res.status).toBe(400);
  });

  it('should accept concurrent at boundary', async () => {
    const res = await request(app)
      .post('/api/platforms')
      .send({
        slug: 'test',
        name: 'Test',
        rateLimitRpm: 60,
        rateLimitConcurrent: 100,
      });

    expect(res.status).toBe(201);
  });
});
