/**
 * Schedule API Routes
 *
 * CRUD operations for scan schedules.
 */

import { Router, Request, Response } from 'express';
import { getScheduler } from '../services/scheduling';

const router = Router();

/**
 * GET /api/schedules
 * List all schedules
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const scheduler = getScheduler();
    const schedules = await scheduler.getAllSchedules();
    res.json(schedules);
  } catch (error: any) {
    console.error('[Schedules API] Get all error:', error);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

/**
 * GET /api/schedules/:id
 * Get a specific schedule
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid schedule ID' });
    }

    const scheduler = getScheduler();
    const schedule = await scheduler.getScheduleById(id);

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json(schedule);
  } catch (error: any) {
    console.error('[Schedules API] Get by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

/**
 * POST /api/schedules
 * Create a new schedule
 * Body: { frequency: 'daily' | 'weekly', platforms: string[], enabled?: boolean }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { frequency, platforms, enabled } = req.body;

    if (!frequency || !['daily', 'weekly'].includes(frequency)) {
      return res.status(400).json({ error: 'Invalid frequency. Must be "daily" or "weekly"' });
    }

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({ error: 'Platforms array is required' });
    }

    const scheduler = getScheduler();
    const schedule = await scheduler.createSchedule({
      frequency,
      platforms,
      enabled: enabled !== false,
    });

    res.status(201).json(schedule);
  } catch (error: any) {
    console.error('[Schedules API] Create error:', error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

/**
 * PATCH /api/schedules/:id
 * Update a schedule
 * Body: { frequency?: string, platforms?: string[], enabled?: boolean }
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid schedule ID' });
    }

    const { frequency, platforms, enabled } = req.body;
    const updates: any = {};

    if (frequency !== undefined) {
      if (!['daily', 'weekly'].includes(frequency)) {
        return res.status(400).json({ error: 'Invalid frequency. Must be "daily" or "weekly"' });
      }
      updates.frequency = frequency;
    }

    if (platforms !== undefined) {
      if (!Array.isArray(platforms)) {
        return res.status(400).json({ error: 'Platforms must be an array' });
      }
      updates.platforms = platforms;
    }

    if (enabled !== undefined) {
      updates.enabled = enabled;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const scheduler = getScheduler();
    const schedule = await scheduler.updateSchedule(id, updates);

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json(schedule);
  } catch (error: any) {
    console.error('[Schedules API] Update error:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

/**
 * DELETE /api/schedules/:id
 * Delete a schedule
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid schedule ID' });
    }

    const scheduler = getScheduler();
    const deleted = await scheduler.deleteSchedule(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json({ success: true, message: 'Schedule deleted' });
  } catch (error: any) {
    console.error('[Schedules API] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

/**
 * POST /api/schedules/:id/run-now
 * Manually trigger a schedule
 */
router.post('/:id/run-now', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid schedule ID' });
    }

    const scheduler = getScheduler();
    const result = await scheduler.runNow(id);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: any) {
    console.error('[Schedules API] Run now error:', error);
    res.status(500).json({ error: 'Failed to trigger scan' });
  }
});

/**
 * GET /api/schedules/status
 * Get scheduler status
 */
router.get('/scheduler/status', async (_req: Request, res: Response) => {
  try {
    const scheduler = getScheduler();
    const status = scheduler.getStatus();
    const enabled = await scheduler.getEnabledSchedules();

    res.json({
      ...status,
      enabledSchedules: enabled.length,
    });
  } catch (error: any) {
    console.error('[Schedules API] Status error:', error);
    res.status(500).json({ error: 'Failed to get scheduler status' });
  }
});

export default router;
