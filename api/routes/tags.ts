/**
 * Tag API Routes
 *
 * CRUD operations for prompt tags and tag assignments.
 */

import { Router, Request, Response } from 'express';
import { getTagManager } from '../services/prompts';

const router = Router();

/**
 * GET /api/tags
 * Get all tags with usage counts
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const tagManager = getTagManager();
    const tags = await tagManager.getAll();
    res.json(tags);
  } catch (error: any) {
    console.error('[Tags API] Get all error:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

/**
 * GET /api/tags/:id
 * Get a specific tag by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid tag ID' });
    }

    const tagManager = getTagManager();
    const tag = await tagManager.getById(id);

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json(tag);
  } catch (error: any) {
    console.error('[Tags API] Get by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch tag' });
  }
});

/**
 * POST /api/tags
 * Create a new tag
 * Body: { name: string, color?: string }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    const tagManager = getTagManager();
    const tag = await tagManager.create(name, color);

    res.status(201).json(tag);
  } catch (error: any) {
    console.error('[Tags API] Create error:', error);
    if (error.message.includes('Tag name')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.includes('Color')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

/**
 * PUT /api/tags/:id
 * Update a tag
 * Body: { name?: string, color?: string }
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid tag ID' });
    }

    const { name, color } = req.body;
    const updates: { name?: string; color?: string } = {};

    if (name !== undefined) updates.name = name;
    if (color !== undefined) updates.color = color;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const tagManager = getTagManager();
    const tag = await tagManager.update(id, updates);

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json(tag);
  } catch (error: any) {
    console.error('[Tags API] Update error:', error);
    if (error.message.includes('Tag name') || error.message.includes('Color')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

/**
 * DELETE /api/tags/:id
 * Delete a tag
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid tag ID' });
    }

    const tagManager = getTagManager();
    const deleted = await tagManager.delete(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json({ success: true, message: 'Tag deleted' });
  } catch (error: any) {
    console.error('[Tags API] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

/**
 * GET /api/prompts/:promptId/tags
 * Get all tags for a prompt
 */
router.get('/prompts/:promptId/tags', async (req: Request, res: Response) => {
  try {
    const promptId = parseInt(req.params.promptId, 10);
    if (isNaN(promptId)) {
      return res.status(400).json({ error: 'Invalid prompt ID' });
    }

    const tagManager = getTagManager();
    const tags = await tagManager.getTagsForPrompt(promptId);

    res.json(tags);
  } catch (error: any) {
    console.error('[Tags API] Get prompt tags error:', error);
    res.status(500).json({ error: 'Failed to fetch prompt tags' });
  }
});

/**
 * POST /api/prompts/:promptId/tags
 * Assign a tag to a prompt
 * Body: { tagId: number }
 */
router.post('/prompts/:promptId/tags', async (req: Request, res: Response) => {
  try {
    const promptId = parseInt(req.params.promptId, 10);
    if (isNaN(promptId)) {
      return res.status(400).json({ error: 'Invalid prompt ID' });
    }

    const { tagId } = req.body;
    if (typeof tagId !== 'number') {
      return res.status(400).json({ error: 'Tag ID is required' });
    }

    const tagManager = getTagManager();
    const assigned = await tagManager.assignToPrompt(promptId, tagId);

    if (!assigned) {
      return res.status(200).json({ success: true, message: 'Tag already assigned' });
    }

    res.status(201).json({ success: true, message: 'Tag assigned' });
  } catch (error: any) {
    console.error('[Tags API] Assign tag error:', error);
    res.status(500).json({ error: 'Failed to assign tag' });
  }
});

/**
 * PUT /api/prompts/:promptId/tags
 * Set all tags for a prompt (replaces existing)
 * Body: { tagIds: number[] }
 */
router.put('/prompts/:promptId/tags', async (req: Request, res: Response) => {
  try {
    const promptId = parseInt(req.params.promptId, 10);
    if (isNaN(promptId)) {
      return res.status(400).json({ error: 'Invalid prompt ID' });
    }

    const { tagIds } = req.body;
    if (!Array.isArray(tagIds)) {
      return res.status(400).json({ error: 'tagIds must be an array' });
    }

    const tagManager = getTagManager();
    const tags = await tagManager.setTagsForPrompt(promptId, tagIds);

    res.json(tags);
  } catch (error: any) {
    console.error('[Tags API] Set prompt tags error:', error);
    res.status(500).json({ error: 'Failed to set prompt tags' });
  }
});

/**
 * DELETE /api/prompts/:promptId/tags/:tagId
 * Remove a tag from a prompt
 */
router.delete('/prompts/:promptId/tags/:tagId', async (req: Request, res: Response) => {
  try {
    const promptId = parseInt(req.params.promptId, 10);
    const tagId = parseInt(req.params.tagId, 10);

    if (isNaN(promptId) || isNaN(tagId)) {
      return res.status(400).json({ error: 'Invalid prompt or tag ID' });
    }

    const tagManager = getTagManager();
    const removed = await tagManager.removeFromPrompt(promptId, tagId);

    if (!removed) {
      return res.status(404).json({ error: 'Tag not assigned to this prompt' });
    }

    res.json({ success: true, message: 'Tag removed from prompt' });
  } catch (error: any) {
    console.error('[Tags API] Remove tag error:', error);
    res.status(500).json({ error: 'Failed to remove tag' });
  }
});

/**
 * GET /api/tags/:tagId/prompts
 * Get all prompt IDs that have a specific tag
 */
router.get('/:tagId/prompts', async (req: Request, res: Response) => {
  try {
    const tagId = parseInt(req.params.tagId, 10);
    if (isNaN(tagId)) {
      return res.status(400).json({ error: 'Invalid tag ID' });
    }

    const tagManager = getTagManager();
    const promptIds = await tagManager.getPromptIdsByTag(tagId);

    res.json({ tagId, promptIds });
  } catch (error: any) {
    console.error('[Tags API] Get prompts by tag error:', error);
    res.status(500).json({ error: 'Failed to fetch prompts by tag' });
  }
});

export default router;
