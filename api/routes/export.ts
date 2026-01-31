/**
 * Export API Routes
 *
 * CSV and PDF export endpoints for prompts, responses, competitors, and sources.
 * Also includes shareable report link management.
 */

import { Router, Request, Response } from 'express';
import {
  exportData,
  getAvailableColumns,
  getExportFilename,
  type ExportType,
} from '../services/export/csv-exporter';
import { generatePDFReport, type ReportSections } from '../services/export/pdf-generator';
import { getShareService } from '../services/reports/share-service';

const router = Router();

const VALID_TYPES: ExportType[] = ['prompts', 'responses', 'competitors', 'sources'];

/**
 * GET /api/export/columns/:type
 * Get available columns for a given export type
 */
router.get('/columns/:type', (req: Request, res: Response) => {
  const type = req.params.type as ExportType;

  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({
      error: 'Invalid export type',
      validTypes: VALID_TYPES,
    });
  }

  const columns = getAvailableColumns(type);
  res.json({ type, columns });
});

/**
 * GET /api/export/csv
 * Export data as CSV
 *
 * Query params:
 *   type: 'prompts' | 'responses' | 'competitors' | 'sources' (required)
 *   columns: comma-separated list of column keys (optional, defaults to all)
 */
router.get('/csv', async (req: Request, res: Response) => {
  try {
    const type = req.query.type as ExportType;

    if (!type || !VALID_TYPES.includes(type)) {
      return res.status(400).json({
        error: 'Invalid or missing export type',
        validTypes: VALID_TYPES,
      });
    }

    // Parse columns if provided
    const columnsParam = req.query.columns as string | undefined;
    const columns = columnsParam ? columnsParam.split(',').map(c => c.trim()) : undefined;

    // Generate CSV
    const csv = await exportData(type, { columns });
    const filename = getExportFilename(type);

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error: any) {
    console.error('[Export API] CSV export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

/**
 * GET /api/export/types
 * Get list of valid export types
 */
router.get('/types', (_req: Request, res: Response) => {
  res.json({ types: VALID_TYPES });
});

// =====================================================
// PDF Export Endpoints
// =====================================================

/**
 * POST /api/export/pdf
 * Generate and download a PDF report
 *
 * Body:
 *   title: string (optional)
 *   brandName: string (optional)
 *   dateRangeStart: string ISO date (optional)
 *   dateRangeEnd: string ISO date (optional)
 *   sections: object with boolean flags (optional)
 */
router.post('/pdf', async (req: Request, res: Response) => {
  try {
    const { title, brandName, dateRangeStart, dateRangeEnd, sections } = req.body;

    const options: {
      title?: string;
      brandName?: string;
      dateRangeStart?: Date;
      dateRangeEnd?: Date;
      sections?: ReportSections;
    } = {};

    if (title) options.title = title;
    if (brandName) options.brandName = brandName;
    if (dateRangeStart) options.dateRangeStart = new Date(dateRangeStart);
    if (dateRangeEnd) options.dateRangeEnd = new Date(dateRangeEnd);
    if (sections) options.sections = sections;

    const pdfBuffer = await generatePDFReport(options);

    const filename = `brand-report-${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('[Export API] PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
});

/**
 * GET /api/export/pdf/sections
 * Get available PDF report sections
 */
router.get('/pdf/sections', (_req: Request, res: Response) => {
  res.json({
    sections: [
      { key: 'overview', name: 'Overview', description: 'Key metrics summary', default: true },
      { key: 'visibility', name: 'Visibility', description: 'Brand visibility score and analysis', default: true },
      { key: 'competitors', name: 'Competitors', description: 'Competitor mention analysis', default: true },
      { key: 'topics', name: 'Topics', description: 'Topic breakdown and analysis', default: true },
      { key: 'sources', name: 'Sources', description: 'Citation sources and domains', default: true },
      { key: 'responses', name: 'Responses', description: 'Sample AI responses', default: false },
      { key: 'recommendations', name: 'Recommendations', description: 'Improvement recommendations', default: true },
    ],
  });
});

// =====================================================
// Shareable Report Links Endpoints
// =====================================================

/**
 * GET /api/export/shared
 * Get all shared report links
 */
router.get('/shared', async (_req: Request, res: Response) => {
  try {
    const shareService = getShareService();
    const reports = await shareService.getAllSharedReports();
    res.json(reports);
  } catch (error: any) {
    console.error('[Export API] Error getting shared reports:', error);
    res.status(500).json({ error: 'Failed to get shared reports' });
  }
});

/**
 * GET /api/export/shared/active
 * Get active (non-expired, non-revoked) shared reports
 */
router.get('/shared/active', async (_req: Request, res: Response) => {
  try {
    const shareService = getShareService();
    const reports = await shareService.getActiveSharedReports();
    res.json(reports);
  } catch (error: any) {
    console.error('[Export API] Error getting active shared reports:', error);
    res.status(500).json({ error: 'Failed to get active shared reports' });
  }
});

/**
 * POST /api/export/shared
 * Create a new shareable report link
 *
 * Body:
 *   title: string (required)
 *   dateRangeStart: string ISO date (optional)
 *   dateRangeEnd: string ISO date (optional)
 *   sections: object with boolean flags (optional)
 *   expiresIn: number of days until expiration (optional, null = never)
 */
router.post('/shared', async (req: Request, res: Response) => {
  try {
    const { title, dateRangeStart, dateRangeEnd, sections, expiresIn } = req.body;

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required' });
    }

    const shareService = getShareService();
    const report = await shareService.createSharedReport({
      title,
      dateRangeStart: dateRangeStart ? new Date(dateRangeStart) : undefined,
      dateRangeEnd: dateRangeEnd ? new Date(dateRangeEnd) : undefined,
      sections,
      expiresIn,
    });

    res.status(201).json({
      ...report,
      shareUrl: `/reports/shared/${report.publicId}`,
    });
  } catch (error: any) {
    console.error('[Export API] Error creating shared report:', error);
    res.status(500).json({ error: 'Failed to create shared report' });
  }
});

/**
 * GET /api/export/shared/:id
 * Get a shared report by ID
 */
router.get('/shared/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }

    const shareService = getShareService();
    const report = await shareService.getSharedReportById(id);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({
      ...report,
      shareUrl: `/reports/shared/${report.publicId}`,
      isValid: shareService.isReportValid(report),
    });
  } catch (error: any) {
    console.error('[Export API] Error getting shared report:', error);
    res.status(500).json({ error: 'Failed to get shared report' });
  }
});

/**
 * PATCH /api/export/shared/:id
 * Update a shared report
 */
router.patch('/shared/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }

    const { title, sections, expiresAt } = req.body;
    const updates: Partial<{ title: string; sections: ReportSections; expiresAt: Date | null }> = {};

    if (title !== undefined) updates.title = title;
    if (sections !== undefined) updates.sections = sections;
    if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const shareService = getShareService();
    const report = await shareService.updateSharedReport(id, updates);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(report);
  } catch (error: any) {
    console.error('[Export API] Error updating shared report:', error);
    res.status(500).json({ error: 'Failed to update shared report' });
  }
});

/**
 * POST /api/export/shared/:id/revoke
 * Revoke a shared report link
 */
router.post('/shared/:id/revoke', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }

    const shareService = getShareService();
    const revoked = await shareService.revokeSharedReport(id);

    if (!revoked) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ success: true, message: 'Report link revoked' });
  } catch (error: any) {
    console.error('[Export API] Error revoking shared report:', error);
    res.status(500).json({ error: 'Failed to revoke shared report' });
  }
});

/**
 * DELETE /api/export/shared/:id
 * Delete a shared report
 */
router.delete('/shared/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }

    const shareService = getShareService();
    const deleted = await shareService.deleteSharedReport(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ success: true, message: 'Report deleted' });
  } catch (error: any) {
    console.error('[Export API] Error deleting shared report:', error);
    res.status(500).json({ error: 'Failed to delete shared report' });
  }
});

/**
 * POST /api/export/shared/cleanup
 * Clean up expired shared reports
 */
router.post('/shared/cleanup', async (_req: Request, res: Response) => {
  try {
    const shareService = getShareService();
    const deletedCount = await shareService.cleanupExpiredReports();

    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} expired reports`,
      deletedCount,
    });
  } catch (error: any) {
    console.error('[Export API] Error cleaning up shared reports:', error);
    res.status(500).json({ error: 'Failed to clean up shared reports' });
  }
});

// =====================================================
// Public Report Viewing Endpoints (no auth required)
// =====================================================

/**
 * GET /api/export/public/:publicId
 * View a shared report (public endpoint)
 */
router.get('/public/:publicId', async (req: Request, res: Response) => {
  try {
    const { publicId } = req.params;

    const shareService = getShareService();
    const reportData = await shareService.getReportData(publicId);

    if (!reportData) {
      return res.status(404).json({ error: 'Report not found or has expired' });
    }

    res.json(reportData);
  } catch (error: any) {
    console.error('[Export API] Error viewing shared report:', error);
    res.status(500).json({ error: 'Failed to view shared report' });
  }
});

/**
 * GET /api/export/public/:publicId/pdf
 * Download PDF for a shared report (public endpoint)
 */
router.get('/public/:publicId/pdf', async (req: Request, res: Response) => {
  try {
    const { publicId } = req.params;

    const shareService = getShareService();
    const pdfBuffer = await shareService.generateReportPDF(publicId);

    if (!pdfBuffer) {
      return res.status(404).json({ error: 'Report not found or has expired' });
    }

    const filename = `shared-report-${publicId.slice(0, 8)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('[Export API] Error downloading shared report PDF:', error);
    res.status(500).json({ error: 'Failed to download report PDF' });
  }
});

export default router;
