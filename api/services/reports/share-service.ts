/**
 * Shareable Reports Service
 *
 * Creates and manages shareable report links with configurable sections,
 * date ranges, and expiration.
 */

import { prisma } from "../../prisma";
import { prismaRoot } from "../../prisma";
import { runInPublicReportTransaction } from "../../context/workspace-context";
import { fromPrismaRow, requireWorkspaceId, toPrismaData } from "../../prisma-mapping";
import type { SharedReport } from "@shared/schema";
import { storage } from '../../data';
import { generatePDFReport, type ReportSections } from '../export/pdf-generator';
import crypto from 'crypto';

/** Report data for public viewing */
export interface SharedReportData {
  id: number;
  publicId: string;
  title: string;
  dateRangeStart: Date | null;
  dateRangeEnd: Date | null;
  sections: ReportSections;
  viewCount: number;
  createdAt: Date | null;
  data: {
    overview?: {
      totalResponses: number;
      brandMentions: number;
      mentionRate: number;
      promptCount: number;
      competitorCount: number;
    };
    competitors?: Array<{
      name: string;
      mentionCount: number;
      category: string | null;
    }>;
    topics?: Array<{
      name: string;
      promptCount: number;
    }>;
    sources?: Array<{
      domain: string;
      citationCount: number;
    }>;
  };
}

/** Create shared report options */
export interface CreateSharedReportOptions {
  title: string;
  dateRangeStart?: Date;
  dateRangeEnd?: Date;
  sections?: ReportSections;
  expiresIn?: number; // Days until expiration (null = never)
}

/** Default sections for shared reports */
const DEFAULT_SECTIONS: ReportSections = {
  overview: true,
  visibility: true,
  competitors: true,
  topics: true,
  sources: true,
  responses: false,
  recommendations: false,
};

/**
 * Shareable Reports Service Class
 */
export class ShareService {
  private static instance: ShareService | null = null;

  static getInstance(): ShareService {
    if (!ShareService.instance) {
      ShareService.instance = new ShareService();
    }
    return ShareService.instance;
  }

  /**
   * Generate a unique public ID
   */
  private generatePublicId(): string {
    return crypto.randomBytes(24).toString('hex');
  }

  /**
   * Create a new shared report link
   */
  async createSharedReport(options: CreateSharedReportOptions): Promise<SharedReport> {
    const {
      title,
      dateRangeStart,
      dateRangeEnd,
      sections = DEFAULT_SECTIONS,
      expiresIn,
    } = options;

    const publicId = this.generatePublicId();
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000) : null;

    const insertData = {
      publicId,
      title,
      dateRangeStart: dateRangeStart || null,
      dateRangeEnd: dateRangeEnd || null,
      sections: sections as Record<string, unknown>,
      expiresAt,
      revoked: false,
    };

    const created = await prisma.shared_reports.create({
      data: { ...toPrismaData(insertData), workspace_id: requireWorkspaceId() } as any,
    });
    return fromPrismaRow<SharedReport>(created as unknown as Record<string, unknown>);
  }

  /**
   * Get a shared report by public ID
   */
  async getSharedReportByPublicId(publicId: string): Promise<SharedReport | undefined> {
    const report = await prisma.shared_reports.findFirst({
      where: { public_id: publicId, workspace_id: requireWorkspaceId() },
    });
    return report ? fromPrismaRow<SharedReport>(report as unknown as Record<string, unknown>) : undefined;
  }

  /**
   * Get a shared report by ID
   */
  async getSharedReportById(id: number): Promise<SharedReport | undefined> {
    const report = await prisma.shared_reports.findFirst({ where: { id, workspace_id: requireWorkspaceId() } });
    return report ? fromPrismaRow<SharedReport>(report as unknown as Record<string, unknown>) : undefined;
  }

  /**
   * Get all shared reports
   */
  async getAllSharedReports(): Promise<SharedReport[]> {
    const rows = await prisma.shared_reports.findMany({
      where: { workspace_id: requireWorkspaceId() }, orderBy: { created_at: "desc" },
    });
    return rows.map((row) => fromPrismaRow<SharedReport>(row as unknown as Record<string, unknown>));
  }

  /**
   * Get active (non-expired, non-revoked) shared reports
   */
  async getActiveSharedReports(): Promise<SharedReport[]> {
    const now = new Date();

    const rows = await prisma.shared_reports.findMany({
      where: { workspace_id: requireWorkspaceId(), revoked: false, OR: [{ expires_at: null }, { expires_at: { gt: now } }] },
      orderBy: { created_at: "desc" },
    });
    return rows.map((row) => fromPrismaRow<SharedReport>(row as unknown as Record<string, unknown>));
  }

  /**
   * Check if a shared report is valid (not expired, not revoked)
   */
  isReportValid(report: SharedReport): boolean {
    if (report.revoked) return false;
    if (report.expiresAt && new Date(report.expiresAt) <= new Date()) return false;
    return true;
  }

  /**
   * Increment view count for a shared report
   */
  async incrementViewCount(publicId: string): Promise<void> {
    await prisma.shared_reports.updateMany({
      where: { public_id: publicId, workspace_id: requireWorkspaceId() },
      data: { view_count: { increment: 1 } },
    });
  }

  /**
   * Revoke a shared report link
   */
  async revokeSharedReport(id: number): Promise<boolean> {
    const result = await prisma.shared_reports.updateMany({ where: { id, workspace_id: requireWorkspaceId() }, data: { revoked: true } });
    return result.count > 0;
  }

  /**
   * Revoke a shared report by public ID
   */
  async revokeByPublicId(publicId: string): Promise<boolean> {
    const result = await prisma.shared_reports.updateMany({ where: { public_id: publicId, workspace_id: requireWorkspaceId() }, data: { revoked: true } });
    return result.count > 0;
  }

  /**
   * Delete a shared report
   */
  async deleteSharedReport(id: number): Promise<boolean> {
    const result = await prisma.shared_reports.deleteMany({ where: { id, workspace_id: requireWorkspaceId() } });
    return result.count > 0;
  }

  /**
   * Get report data for public viewing
   */
  async getReportData(publicId: string): Promise<SharedReportData | null> {
    return runInPublicReportTransaction(prismaRoot, publicId, async () => {
    const report = await this.getSharedReportByPublicId(publicId);

    if (!report || !this.isReportValid(report)) {
      return null;
    }

    // Increment view count
    await this.incrementViewCount(publicId);

    // Get data based on sections
    const sections = report.sections as ReportSections;
    const data: SharedReportData['data'] = {};

    // Fetch all data we might need
    const responses = await storage.getResponses();
    const prompts = await storage.getPrompts();
    const competitors = await storage.getCompetitors();
    const sources = await storage.getSources();
    const topics = await storage.getTopics();

    // Filter by date range if provided
    let filteredResponses = responses;
    if (report.dateRangeStart || report.dateRangeEnd) {
      filteredResponses = responses.filter(r => {
        if (!r.createdAt) return true;
        const date = new Date(r.createdAt);
        if (report.dateRangeStart && date < new Date(report.dateRangeStart)) return false;
        if (report.dateRangeEnd && date > new Date(report.dateRangeEnd)) return false;
        return true;
      });
    }

    // Overview data
    if (sections.overview || sections.visibility) {
      const brandMentions = filteredResponses.filter(r => r.brandMentioned).length;
      const mentionRate = filteredResponses.length > 0
        ? (brandMentions / filteredResponses.length) * 100
        : 0;

      data.overview = {
        totalResponses: filteredResponses.length,
        brandMentions,
        mentionRate: Math.round(mentionRate * 10) / 10,
        promptCount: prompts.length,
        competitorCount: competitors.length,
      };
    }

    // Competitors data
    if (sections.competitors) {
      data.competitors = competitors
        .slice()
        .sort((a, b) => (b.mentionCount || 0) - (a.mentionCount || 0))
        .slice(0, 10)
        .map(c => ({
          name: c.name,
          mentionCount: c.mentionCount || 0,
          category: c.category,
        }));
    }

    // Topics data
    if (sections.topics) {
      data.topics = topics.map(topic => {
        const topicPrompts = prompts.filter(p => p.topicId === topic.id);
        return {
          name: topic.name,
          promptCount: topicPrompts.length,
        };
      }).sort((a, b) => b.promptCount - a.promptCount);
    }

    // Sources data
    if (sections.sources) {
      data.sources = sources
        .slice()
        .sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0))
        .slice(0, 15)
        .map(s => ({
          domain: s.domain,
          citationCount: s.citationCount || 0,
        }));
    }

    return {
      id: report.id,
      publicId: report.publicId,
      title: report.title,
      dateRangeStart: report.dateRangeStart,
      dateRangeEnd: report.dateRangeEnd,
      sections,
      viewCount: (report.viewCount || 0) + 1, // Include the current view
      createdAt: report.createdAt,
      data,
    };
    });
  }

  /**
   * Generate PDF for a shared report
   */
  async generateReportPDF(publicId: string): Promise<Buffer | null> {
    return runInPublicReportTransaction(prismaRoot, publicId, async () => {
    const report = await this.getSharedReportByPublicId(publicId);

    if (!report || !this.isReportValid(report)) {
      return null;
    }

    const sections = report.sections as ReportSections;

    return generatePDFReport({
      title: report.title,
      dateRangeStart: report.dateRangeStart || undefined,
      dateRangeEnd: report.dateRangeEnd || undefined,
      sections,
    });
    });
  }

  /**
   * Update a shared report
   */
  async updateSharedReport(
    id: number,
    updates: Partial<{
      title: string;
      sections: ReportSections;
      expiresAt: Date | null;
    }>
  ): Promise<SharedReport | undefined> {
    const updateData: Record<string, unknown> = {};

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.sections !== undefined) updateData.sections = updates.sections;
    if (updates.expiresAt !== undefined) updateData.expires_at = updates.expiresAt;
    const result = await prisma.shared_reports.updateMany({
      where: { id, workspace_id: requireWorkspaceId() }, data: updateData as any,
    });
    return result.count ? this.getSharedReportById(id) : undefined;
  }

  /**
   * Clean up expired reports
   */
  async cleanupExpiredReports(): Promise<number> {
    const now = new Date();

    const result = await prisma.shared_reports.deleteMany({
      where: { workspace_id: requireWorkspaceId(), expires_at: { not: null, lt: now } },
    });
    return result.count;
  }
}

/** Singleton getter */
let shareService: ShareService | null = null;

export function getShareService(): ShareService {
  if (!shareService) {
    shareService = ShareService.getInstance();
  }
  return shareService;
}
