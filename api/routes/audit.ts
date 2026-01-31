/**
 * Audit API Routes
 *
 * Endpoints for running and retrieving site audits for AI bot accessibility.
 */

import { Router, Request, Response } from 'express';
import {
  runSiteAudit,
  saveAuditResult,
  getAuditById,
  getAuditsForUrl,
  getRecentAudits,
} from '../services/audit';

const router = Router();

/**
 * POST /api/audit/run
 * Run an AI bot accessibility audit on a URL
 * Body: { url: string }
 */
router.post('/run', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    console.log(`[Audit API] Running audit for: ${url}`);

    // Run the audit
    const result = await runSiteAudit(url);

    // Save to database
    const savedAudit = await saveAuditResult(result);

    res.status(201).json({
      success: true,
      audit: savedAudit,
    });
  } catch (error: any) {
    console.error('[Audit API] Run audit error:', error);
    res.status(500).json({
      error: 'Failed to run audit',
      message: error.message || 'Unknown error',
    });
  }
});

/**
 * GET /api/audit/:id
 * Get a specific audit by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid audit ID' });
    }

    const audit = await getAuditById(id);

    if (!audit) {
      return res.status(404).json({ error: 'Audit not found' });
    }

    res.json(audit);
  } catch (error: any) {
    console.error('[Audit API] Get audit error:', error);
    res.status(500).json({ error: 'Failed to fetch audit' });
  }
});

/**
 * GET /api/audit/url/:encodedUrl
 * Get audits for a specific URL
 */
router.get('/url/:encodedUrl', async (req: Request, res: Response) => {
  try {
    const url = decodeURIComponent(req.params.encodedUrl);
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const audits = await getAuditsForUrl(url, limit);
    res.json(audits);
  } catch (error: any) {
    console.error('[Audit API] Get audits for URL error:', error);
    res.status(500).json({ error: 'Failed to fetch audits' });
  }
});

/**
 * GET /api/audit
 * Get recent audits
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const audits = await getRecentAudits(limit);
    res.json(audits);
  } catch (error: any) {
    console.error('[Audit API] Get recent audits error:', error);
    res.status(500).json({ error: 'Failed to fetch audits' });
  }
});

export default router;
