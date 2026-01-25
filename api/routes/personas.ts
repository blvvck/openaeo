/**
 * Persona API Routes
 *
 * CRUD operations for personas and persona-prompt assignments.
 */

import { Router, Request, Response } from 'express';
import { getPersonaManager, SUPPORTED_COUNTRIES } from '../services/personas';

const router = Router();

/**
 * GET /api/personas
 * Get all personas with prompt counts
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const personaManager = getPersonaManager();
    const personas = await personaManager.getAll();
    res.json(personas);
  } catch (error: any) {
    console.error('[Personas API] Get all error:', error);
    res.status(500).json({ error: 'Failed to fetch personas' });
  }
});

/**
 * GET /api/personas/countries
 * Get list of supported country codes
 */
router.get('/countries', (_req: Request, res: Response) => {
  res.json(SUPPORTED_COUNTRIES);
});

/**
 * GET /api/personas/:id
 * Get a specific persona by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid persona ID' });
    }

    const personaManager = getPersonaManager();
    const persona = await personaManager.getById(id);

    if (!persona) {
      return res.status(404).json({ error: 'Persona not found' });
    }

    res.json(persona);
  } catch (error: any) {
    console.error('[Personas API] Get by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch persona' });
  }
});

/**
 * POST /api/personas
 * Create a new persona
 * Body: { name: string, country?: string, description?: string }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, country, description } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Persona name is required' });
    }

    const personaManager = getPersonaManager();
    const persona = await personaManager.create({ name, country, description });

    res.status(201).json(persona);
  } catch (error: any) {
    console.error('[Personas API] Create error:', error);
    if (error.message.includes('name') || error.message.includes('Country')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create persona' });
  }
});

/**
 * PATCH /api/personas/:id
 * Update a persona
 * Body: { name?: string, country?: string, description?: string }
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid persona ID' });
    }

    const { name, country, description } = req.body;
    const updates: { name?: string; country?: string | null; description?: string | null } = {};

    if (name !== undefined) updates.name = name;
    if (country !== undefined) updates.country = country;
    if (description !== undefined) updates.description = description;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const personaManager = getPersonaManager();
    const persona = await personaManager.update(id, updates);

    if (!persona) {
      return res.status(404).json({ error: 'Persona not found' });
    }

    res.json(persona);
  } catch (error: any) {
    console.error('[Personas API] Update error:', error);
    if (error.message.includes('name') || error.message.includes('Country')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update persona' });
  }
});

/**
 * DELETE /api/personas/:id
 * Delete a persona
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid persona ID' });
    }

    const personaManager = getPersonaManager();
    const deleted = await personaManager.delete(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Persona not found' });
    }

    res.json({ success: true, message: 'Persona deleted' });
  } catch (error: any) {
    console.error('[Personas API] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete persona' });
  }
});

/**
 * GET /api/personas/:id/prompts
 * Get all prompt IDs for a persona
 */
router.get('/:id/prompts', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid persona ID' });
    }

    const personaManager = getPersonaManager();
    const promptIds = await personaManager.getPromptIds(id);

    res.json({ personaId: id, promptIds });
  } catch (error: any) {
    console.error('[Personas API] Get prompts error:', error);
    res.status(500).json({ error: 'Failed to fetch prompts for persona' });
  }
});

/**
 * PATCH /api/prompts/:promptId/persona
 * Assign or remove a persona from a prompt
 * Body: { personaId: number | null }
 */
router.patch('/prompts/:promptId/persona', async (req: Request, res: Response) => {
  try {
    const promptId = parseInt(req.params.promptId, 10);
    if (isNaN(promptId)) {
      return res.status(400).json({ error: 'Invalid prompt ID' });
    }

    const { personaId } = req.body;
    if (personaId !== null && typeof personaId !== 'number') {
      return res.status(400).json({ error: 'personaId must be a number or null' });
    }

    const personaManager = getPersonaManager();
    const updated = await personaManager.assignToPrompt(promptId, personaId);

    if (!updated) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    res.json({ success: true, message: personaId ? 'Persona assigned' : 'Persona removed' });
  } catch (error: any) {
    console.error('[Personas API] Assign persona error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to assign persona' });
  }
});

/**
 * POST /api/personas/:id/assign
 * Bulk assign a persona to multiple prompts
 * Body: { promptIds: number[] }
 */
router.post('/:id/assign', async (req: Request, res: Response) => {
  try {
    const personaId = parseInt(req.params.id, 10);
    if (isNaN(personaId)) {
      return res.status(400).json({ error: 'Invalid persona ID' });
    }

    const { promptIds } = req.body;
    if (!Array.isArray(promptIds)) {
      return res.status(400).json({ error: 'promptIds must be an array' });
    }

    const personaManager = getPersonaManager();
    const count = await personaManager.bulkAssign(promptIds, personaId);

    res.json({ success: true, message: `Assigned persona to ${count} prompts`, count });
  } catch (error: any) {
    console.error('[Personas API] Bulk assign error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to bulk assign persona' });
  }
});

export default router;
