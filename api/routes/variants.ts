/**
 * Variant API Routes
 *
 * A/B testing operations for prompt variants.
 */

import { Router, Request, Response } from 'express';
import { getVariantManager, MIN_SAMPLES_FOR_WINNER } from '../services/prompts';

const router = Router();

/**
 * GET /api/prompts/:promptId/variants
 * Get all variants for a prompt
 */
router.get('/prompts/:promptId/variants', async (req: Request, res: Response) => {
  try {
    const promptId = parseInt(req.params.promptId, 10);
    if (isNaN(promptId)) {
      return res.status(400).json({ error: 'Invalid prompt ID' });
    }

    const variantManager = getVariantManager();
    const variants = await variantManager.getVariantsWithPerformance(promptId);

    res.json(variants);
  } catch (error: any) {
    console.error('[Variants API] Get variants error:', error);
    res.status(500).json({ error: 'Failed to fetch variants' });
  }
});

/**
 * POST /api/prompts/:promptId/variants
 * Create a new variant
 * Body: { text: string, isControl?: boolean }
 */
router.post('/prompts/:promptId/variants', async (req: Request, res: Response) => {
  try {
    const promptId = parseInt(req.params.promptId, 10);
    if (isNaN(promptId)) {
      return res.status(400).json({ error: 'Invalid prompt ID' });
    }

    const { text, isControl } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Variant text is required' });
    }

    const variantManager = getVariantManager();
    const variant = await variantManager.create(promptId, text, isControl || false);

    res.status(201).json(variant);
  } catch (error: any) {
    console.error('[Variants API] Create variant error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('text')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create variant' });
  }
});

/**
 * POST /api/prompts/:promptId/variants/control
 * Create a control variant from the base prompt text
 */
router.post('/prompts/:promptId/variants/control', async (req: Request, res: Response) => {
  try {
    const promptId = parseInt(req.params.promptId, 10);
    if (isNaN(promptId)) {
      return res.status(400).json({ error: 'Invalid prompt ID' });
    }

    const variantManager = getVariantManager();
    const variant = await variantManager.createControlFromBase(promptId);

    res.status(201).json(variant);
  } catch (error: any) {
    console.error('[Variants API] Create control error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create control variant' });
  }
});

/**
 * GET /api/prompts/:promptId/variants/compare
 * Compare variant performance
 */
router.get('/prompts/:promptId/variants/compare', async (req: Request, res: Response) => {
  try {
    const promptId = parseInt(req.params.promptId, 10);
    if (isNaN(promptId)) {
      return res.status(400).json({ error: 'Invalid prompt ID' });
    }

    const variantManager = getVariantManager();
    const comparison = await variantManager.compareVariants(promptId);

    res.json({
      ...comparison,
      config: {
        minSamplesForWinner: MIN_SAMPLES_FOR_WINNER,
      },
    });
  } catch (error: any) {
    console.error('[Variants API] Compare variants error:', error);
    res.status(500).json({ error: 'Failed to compare variants' });
  }
});

/**
 * GET /api/variants/:variantId
 * Get a specific variant
 */
router.get('/variants/:variantId', async (req: Request, res: Response) => {
  try {
    const variantId = parseInt(req.params.variantId, 10);
    if (isNaN(variantId)) {
      return res.status(400).json({ error: 'Invalid variant ID' });
    }

    const variantManager = getVariantManager();
    const variant = await variantManager.getById(variantId);

    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    res.json(variant);
  } catch (error: any) {
    console.error('[Variants API] Get variant error:', error);
    res.status(500).json({ error: 'Failed to fetch variant' });
  }
});

/**
 * PATCH /api/variants/:variantId
 * Update a variant's text
 * Body: { text: string }
 */
router.patch('/variants/:variantId', async (req: Request, res: Response) => {
  try {
    const variantId = parseInt(req.params.variantId, 10);
    if (isNaN(variantId)) {
      return res.status(400).json({ error: 'Invalid variant ID' });
    }

    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Variant text is required' });
    }

    const variantManager = getVariantManager();
    const variant = await variantManager.update(variantId, text);

    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    res.json(variant);
  } catch (error: any) {
    console.error('[Variants API] Update variant error:', error);
    if (error.message.includes('text')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update variant' });
  }
});

/**
 * DELETE /api/variants/:variantId
 * Delete a variant
 */
router.delete('/variants/:variantId', async (req: Request, res: Response) => {
  try {
    const variantId = parseInt(req.params.variantId, 10);
    if (isNaN(variantId)) {
      return res.status(400).json({ error: 'Invalid variant ID' });
    }

    const variantManager = getVariantManager();
    const deleted = await variantManager.delete(variantId);

    if (!deleted) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    res.json({ success: true, message: 'Variant deleted' });
  } catch (error: any) {
    console.error('[Variants API] Delete variant error:', error);
    res.status(500).json({ error: 'Failed to delete variant' });
  }
});

/**
 * POST /api/variants/:variantId/promote
 * Promote a variant to replace the base prompt
 */
router.post('/variants/:variantId/promote', async (req: Request, res: Response) => {
  try {
    const variantId = parseInt(req.params.variantId, 10);
    if (isNaN(variantId)) {
      return res.status(400).json({ error: 'Invalid variant ID' });
    }

    const variantManager = getVariantManager();
    const result = await variantManager.promoteVariant(variantId);

    if (!result.success) {
      return res.status(404).json({ error: result.message });
    }

    res.json(result);
  } catch (error: any) {
    console.error('[Variants API] Promote variant error:', error);
    res.status(500).json({ error: 'Failed to promote variant' });
  }
});

/**
 * POST /api/variants/:variantId/control
 * Set a variant as the control
 */
router.post('/variants/:variantId/control', async (req: Request, res: Response) => {
  try {
    const variantId = parseInt(req.params.variantId, 10);
    if (isNaN(variantId)) {
      return res.status(400).json({ error: 'Invalid variant ID' });
    }

    const variantManager = getVariantManager();
    const variant = await variantManager.setControl(variantId);

    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    res.json({ success: true, message: 'Variant set as control', variant });
  } catch (error: any) {
    console.error('[Variants API] Set control error:', error);
    res.status(500).json({ error: 'Failed to set control' });
  }
});

/**
 * PUT /api/variants/:variantId/performance
 * Update performance metrics for a variant
 * Body: { avgVisibility: number, avgPosition: number, avgMentions: number, sampleSize: number }
 */
router.put('/variants/:variantId/performance', async (req: Request, res: Response) => {
  try {
    const variantId = parseInt(req.params.variantId, 10);
    if (isNaN(variantId)) {
      return res.status(400).json({ error: 'Invalid variant ID' });
    }

    const { avgVisibility, avgPosition, avgMentions, sampleSize } = req.body;

    if (typeof avgVisibility !== 'number' ||
        typeof avgPosition !== 'number' ||
        typeof avgMentions !== 'number' ||
        typeof sampleSize !== 'number') {
      return res.status(400).json({
        error: 'All metrics (avgVisibility, avgPosition, avgMentions, sampleSize) must be numbers',
      });
    }

    const variantManager = getVariantManager();
    const performance = await variantManager.updatePerformance(variantId, {
      avgVisibility,
      avgPosition,
      avgMentions,
      sampleSize,
    });

    res.json(performance);
  } catch (error: any) {
    console.error('[Variants API] Update performance error:', error);
    res.status(500).json({ error: 'Failed to update performance' });
  }
});

/**
 * GET /api/variants/prompts-with-variants
 * Get list of all prompts that have variants
 */
router.get('/variants/prompts-with-variants', async (_req: Request, res: Response) => {
  try {
    const variantManager = getVariantManager();
    const results = await variantManager.getPromptsWithVariants();

    res.json(results);
  } catch (error: any) {
    console.error('[Variants API] Get prompts with variants error:', error);
    res.status(500).json({ error: 'Failed to fetch prompts with variants' });
  }
});

export default router;
