

import { Router } from 'express';
import { z } from 'zod';
import {
  getPlatformService,
  type CreatePlatformInput,
  type UpdatePlatformInput,
  type PlatformType,
} from '../services/platforms/platform-service';
import { AI_PLATFORMS, type PlatformsResponse, type PlatformId } from '@shared/types/platforms';

const router = Router();

// Derive platform type enum from AI_PLATFORMS (single source of truth)
// Zod requires a mutable tuple with at least one element
const platformIds = AI_PLATFORMS.map(p => p.id as string);
const PLATFORM_TYPE_VALUES: [string, ...string[]] = [
  platformIds[0],
  ...platformIds.slice(1),
  'custom'
];

// Validation schemas
const createPlatformSchema = z.object({
  slug: z.string()
    .min(1, 'Slug is required')
    .max(50, 'Slug must be 50 characters or less')
    .regex(/^[a-zA-Z0-9-]+$/, 'Slug can only contain letters, numbers, and hyphens'),
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  iconUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional().default(true),
  rateLimitRpm: z.number()
    .int()
    .min(1, 'RPM must be at least 1')
    .max(10000, 'RPM cannot exceed 10000'),
  rateLimitConcurrent: z.number()
    .int()
    .min(1, 'Concurrent limit must be at least 1')
    .max(100, 'Concurrent limit cannot exceed 100'),
  type: z.enum(PLATFORM_TYPE_VALUES).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

const updatePlatformSchema = z.object({
  name: z.string()
    .min(1, 'Name cannot be empty')
    .max(100, 'Name must be 100 characters or less')
    .optional(),
  iconUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
  rateLimitRpm: z.number()
    .int()
    .min(1, 'RPM must be at least 1')
    .max(10000, 'RPM cannot exceed 10000')
    .optional(),
  rateLimitConcurrent: z.number()
    .int()
    .min(1, 'Concurrent limit must be at least 1')
    .max(100, 'Concurrent limit cannot exceed 100')
    .optional(),
  type: z.enum(PLATFORM_TYPE_VALUES).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

const updateRateLimitsSchema = z.object({
  rateLimitRpm: z.number()
    .int()
    .min(1, 'RPM must be at least 1')
    .max(10000, 'RPM cannot exceed 10000'),
  rateLimitConcurrent: z.number()
    .int()
    .min(1, 'Concurrent limit must be at least 1')
    .max(100, 'Concurrent limit cannot exceed 100'),
});

/**
 * GET /api/platforms/list
 * Get the static list of AI platforms we track
 * This is the single source of truth for platform metadata (id, name, color)
 *
 * Response: { platforms: [{ id, name, color }, ...] }
 */
router.get('/list', (_req, res) => {
  const response: PlatformsResponse = {
    platforms: AI_PLATFORMS,
  };
  res.json(response);
});

/**
 * GET /api/platforms
 * List all platforms (dynamic DB records)
 */
router.get('/', async (req, res) => {
  try {
    const service = getPlatformService();
    const platforms = await service.getAll();
    res.json(platforms);
  } catch (error) {
    console.error('Error fetching platforms:', error);
    res.status(500).json({ error: 'Failed to fetch platforms' });
  }
});

/**
 * GET /api/platforms/active
 * List active platforms only
 */
router.get('/active', async (req, res) => {
  try {
    const service = getPlatformService();
    const platforms = await service.getActive();
    res.json(platforms);
  } catch (error) {
    console.error('Error fetching active platforms:', error);
    res.status(500).json({ error: 'Failed to fetch active platforms' });
  }
});

/**
 * GET /api/platforms/stats
 * Get platform statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const service = getPlatformService();
    const stats = await service.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    res.status(500).json({ error: 'Failed to fetch platform statistics' });
  }
});

/**
 * GET /api/platforms/by-slug/:slug
 * Get platform by slug
 */
router.get('/by-slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const service = getPlatformService();
    const platform = await service.getBySlug(slug);

    if (!platform) {
      return res.status(404).json({ error: 'Platform not found' });
    }

    res.json(platform);
  } catch (error) {
    console.error('Error fetching platform by slug:', error);
    res.status(500).json({ error: 'Failed to fetch platform' });
  }
});

/**
 * GET /api/platforms/:id
 * Get platform by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const service = getPlatformService();
    const platform = await service.getById(id);

    if (!platform) {
      return res.status(404).json({ error: 'Platform not found' });
    }

    res.json(platform);
  } catch (error) {
    console.error('Error fetching platform:', error);
    res.status(500).json({ error: 'Failed to fetch platform' });
  }
});

/**
 * POST /api/platforms
 * Create new platform
 */
router.post('/', async (req, res) => {
  try {
    const validation = createPlatformSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.flatten().fieldErrors,
      });
    }

    const service = getPlatformService();
    const platform = await service.create(validation.data as CreatePlatformInput);
    res.status(201).json(platform);
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    console.error('Error creating platform:', error);
    res.status(500).json({ error: 'Failed to create platform' });
  }
});

/**
 * PUT /api/platforms/:id
 * Update platform
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validation = updatePlatformSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.flatten().fieldErrors,
      });
    }

    const service = getPlatformService();
    const platform = await service.update(id, validation.data as UpdatePlatformInput);

    if (!platform) {
      return res.status(404).json({ error: 'Platform not found' });
    }

    res.json(platform);
  } catch (error) {
    console.error('Error updating platform:', error);
    res.status(500).json({ error: 'Failed to update platform' });
  }
});

/**
 * DELETE /api/platforms/:id
 * Delete platform
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const service = getPlatformService();
    const deleted = await service.delete(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Platform not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting platform:', error);
    res.status(500).json({ error: 'Failed to delete platform' });
  }
});

/**
 * PATCH /api/platforms/:id/toggle
 * Toggle platform active status
 */
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const service = getPlatformService();
    const platform = await service.toggleActive(id);

    if (!platform) {
      return res.status(404).json({ error: 'Platform not found' });
    }

    res.json(platform);
  } catch (error) {
    console.error('Error toggling platform:', error);
    res.status(500).json({ error: 'Failed to toggle platform status' });
  }
});

/**
 * PATCH /api/platforms/:id/rate-limits
 * Update rate limits
 */
router.patch('/:id/rate-limits', async (req, res) => {
  try {
    const { id } = req.params;
    const validation = updateRateLimitsSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.flatten().fieldErrors,
      });
    }

    const { rateLimitRpm, rateLimitConcurrent } = validation.data;
    const service = getPlatformService();
    const platform = await service.updateRateLimits(id, rateLimitRpm, rateLimitConcurrent);

    if (!platform) {
      return res.status(404).json({ error: 'Platform not found' });
    }

    res.json(platform);
  } catch (error) {
    if (error instanceof Error && error.message.includes('must be between')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error updating rate limits:', error);
    res.status(500).json({ error: 'Failed to update rate limits' });
  }
});

export default router;
