/**
 * Reports System Types
 *
 * Shared types for report generation, sharing, and viewing.
 */

/** Report section types that can be included in a PDF report */
export type ReportSection =
  | 'executive_summary'
  | 'visibility_metrics'
  | 'platform_breakdown'
  | 'competitor_analysis'
  | 'sentiment_analysis'
  | 'top_sources'
  | 'prompt_performance'
  | 'recommendations';

/** Shared report status */
export type SharedReportStatus = 'active' | 'expired' | 'revoked';

/** Report generation request */
export interface GenerateReportRequest {
  /** Start date for report data */
  startDate: string;
  /** End date for report data */
  endDate: string;
  /** Sections to include in the report */
  sections: ReportSection[];
  /** Report title (optional) */
  title?: string;
  /** Include charts/visualizations */
  includeCharts?: boolean;
}

/** Report generation response */
export interface GenerateReportResponse {
  /** URL to download the PDF */
  downloadUrl: string;
  /** Report file name */
  fileName: string;
  /** Report generation timestamp */
  generatedAt: string;
  /** Size in bytes */
  size: number;
}

/** Shared report record */
export interface SharedReport {
  id: number;
  /** Public UUID for URL access */
  publicId: string;
  /** Report title */
  title: string;
  /** Date range for report data */
  dateRange: {
    start: string;
    end: string;
  };
  /** Included sections */
  sections: ReportSection[];
  /** When the share was created */
  createdAt: string;
  /** Optional expiration date */
  expiresAt?: string;
  /** Number of times accessed */
  accessCount: number;
  /** Current status */
  status: SharedReportStatus;
  /** Full public URL */
  publicUrl: string;
}

/** Create shared report request */
export interface CreateSharedReportRequest {
  /** Report title */
  title: string;
  /** Start date */
  startDate: string;
  /** End date */
  endDate: string;
  /** Sections to include */
  sections: ReportSection[];
  /** Optional expiration in days */
  expiresInDays?: number;
}

/** Public report view data */
export interface PublicReportData {
  /** Report title */
  title: string;
  /** Date range */
  dateRange: {
    start: string;
    end: string;
  };
  /** Brand name */
  brandName: string;
  /** Generated timestamp */
  generatedAt: string;
  /** Report sections with data */
  sections: Record<ReportSection, unknown>;
}

/** Report section display info */
export const REPORT_SECTIONS: Record<
  ReportSection,
  { label: string; description: string }
> = {
  executive_summary: {
    label: 'Executive Summary',
    description: 'High-level overview of visibility and key metrics',
  },
  visibility_metrics: {
    label: 'Visibility Metrics',
    description: 'Overall visibility score and trends over time',
  },
  platform_breakdown: {
    label: 'Platform Breakdown',
    description: 'Performance by LLM platform (ChatGPT, Claude, etc.)',
  },
  competitor_analysis: {
    label: 'Competitor Analysis',
    description: 'Comparison with detected competitors',
  },
  sentiment_analysis: {
    label: 'Sentiment Analysis',
    description: 'Sentiment breakdown in brand mentions',
  },
  top_sources: {
    label: 'Top Sources',
    description: 'Most cited sources and their influence',
  },
  prompt_performance: {
    label: 'Prompt Performance',
    description: 'Best and worst performing prompts',
  },
  recommendations: {
    label: 'Recommendations',
    description: 'AI-generated improvement suggestions',
  },
};

/** Default sections for quick report generation */
export const DEFAULT_REPORT_SECTIONS: ReportSection[] = [
  'executive_summary',
  'visibility_metrics',
  'platform_breakdown',
  'competitor_analysis',
];
