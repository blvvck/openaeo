/**
 * Logo API Routes
 *
 * Endpoints for fetching cached company logos
 * GET /api/logos/:domain — Get logo for a domain
 * GET /api/logos/stats — Get cache statistics
 * DELETE /api/logos/:domain — Invalidate cached logo
 */

import { Router, Request, Response } from 'express';
import { getLogo, invalidateLogo, getLogoStats } from '../services/logo';

const router = Router();

/**
 * GET /api/logos/stats
 * Returns cache statistics
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await getLogoStats();
    res.json(stats);
  } catch (error) {
    console.error('[Logos API] Error fetching stats:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to fetch logo cache statistics',
    });
  }
});

/**
 * GET /api/logos/:domain
 * Returns cached logo URL for a domain
 */
router.get('/:domain', async (req: Request, res: Response) => {
  try {
    const { domain } = req.params;

    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({
        code: 'INVALID_REQUEST',
        message: 'Domain parameter is required',
      });
    }

    const result = await getLogo(domain);

    res.json({
      domain: domain.toLowerCase().replace(/^www\./, ''),
      logoUrl: result.logoUrl,
      source: result.source,
    });
  } catch (error) {
    console.error('[Logos API] Error fetching logo:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to fetch logo',
    });
  }
});

/**
 * DELETE /api/logos/:domain
 * Invalidates cached logo for a domain (forces re-fetch on next request)
 */
router.delete('/:domain', async (req: Request, res: Response) => {
  try {
    const { domain } = req.params;

    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({
        code: 'INVALID_REQUEST',
        message: 'Domain parameter is required',
      });
    }

    await invalidateLogo(domain);

    res.json({
      success: true,
      message: `Logo cache invalidated for ${domain}`,
    });
  } catch (error) {
    console.error('[Logos API] Error invalidating logo:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to invalidate logo cache',
    });
  }
});

export default router;
