import { workspaceFetch as fetch } from '@/lib/workspace-query';
import { useState, useCallback } from 'react';

type ExportType = 'prompts' | 'responses' | 'competitors' | 'sources';

interface ExportOptions {
  /** Type of data to export */
  type: ExportType;
  /** Columns to include (if not specified, includes all) */
  columns?: string[];
  /** Date range filter */
  dateRange?: {
    start: Date | string;
    end: Date | string;
  };
  /** File name (without extension) */
  fileName?: string;
}

interface ExportState {
  /** Whether export is in progress */
  isLoading: boolean;
  /** Export error message */
  error: string | null;
  /** Last successful export timestamp */
  lastExport: Date | null;
}

interface UseExportReturn extends ExportState {
  /** Trigger an export */
  exportData: (options: ExportOptions) => Promise<void>;
  /** Clear any errors */
  clearError: () => void;
}

/**
 * Build query parameters for export API
 */
function buildQueryParams(options: ExportOptions): URLSearchParams {
  const params = new URLSearchParams();

  params.set('type', options.type);

  if (options.columns && options.columns.length > 0) {
    params.set('columns', options.columns.join(','));
  }

  if (options.dateRange) {
    const start = typeof options.dateRange.start === 'string'
      ? options.dateRange.start
      : options.dateRange.start.toISOString();
    const end = typeof options.dateRange.end === 'string'
      ? options.dateRange.end
      : options.dateRange.end.toISOString();
    params.set('startDate', start);
    params.set('endDate', end);
  }

  return params;
}

/**
 * Trigger browser download of blob
 */
function downloadBlob(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Get default file name for export type
 */
function getDefaultFileName(type: ExportType): string {
  const timestamp = new Date().toISOString().split('T')[0];
  return `${type}-export-${timestamp}`;
}

/**
 * useExport - Hook for exporting data to CSV
 *
 * Features:
 * - Fetches from /api/export/csv endpoint
 * - Triggers browser download
 * - Loading and error states
 * - Column selection support
 *
 * @example
 * ```tsx
 * const { exportData, isLoading, error } = useExport();
 *
 * const handleExport = () => {
 *   exportData({
 *     type: 'prompts',
 *     columns: ['text', 'category', 'createdAt'],
 *   });
 * };
 * ```
 */
export function useExport(): UseExportReturn {
  const [state, setState] = useState<ExportState>({
    isLoading: false,
    error: null,
    lastExport: null,
  });

  const exportData = useCallback(async (options: ExportOptions) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const params = buildQueryParams(options);
      const response = await fetch(`/api/export/csv?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Export failed: ${response.statusText}`);
      }

      // Get the blob from response
      const blob = await response.blob();

      // Determine file name
      const fileName = options.fileName || getDefaultFileName(options.type);
      const fullFileName = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;

      // Trigger download
      downloadBlob(blob, fullFileName);

      setState({
        isLoading: false,
        error: null,
        lastExport: new Date(),
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Export failed',
      }));
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    exportData,
    clearError,
  };
}

/**
 * Available columns for each export type
 */
export const EXPORT_COLUMNS: Record<ExportType, { key: string; label: string }[]> = {
  prompts: [
    { key: 'id', label: 'ID' },
    { key: 'text', label: 'Prompt Text' },
    { key: 'category', label: 'Category' },
    { key: 'journeyStage', label: 'Journey Stage' },
    { key: 'createdAt', label: 'Created At' },
    { key: 'lastAnalyzed', label: 'Last Analyzed' },
  ],
  responses: [
    { key: 'id', label: 'ID' },
    { key: 'promptId', label: 'Prompt ID' },
    { key: 'platform', label: 'Platform' },
    { key: 'text', label: 'Response Text' },
    { key: 'brandMentioned', label: 'Brand Mentioned' },
    { key: 'position', label: 'Position' },
    { key: 'sentiment', label: 'Sentiment' },
    { key: 'citations', label: 'Citations' },
    { key: 'createdAt', label: 'Created At' },
  ],
  competitors: [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Competitor Name' },
    { key: 'domain', label: 'Domain' },
    { key: 'mentions', label: 'Mention Count' },
    { key: 'avgPosition', label: 'Avg Position' },
    { key: 'avgSentiment', label: 'Avg Sentiment' },
    { key: 'detectedAt', label: 'First Detected' },
  ],
  sources: [
    { key: 'id', label: 'ID' },
    { key: 'url', label: 'URL' },
    { key: 'domain', label: 'Domain' },
    { key: 'citationCount', label: 'Citation Count' },
    { key: 'platforms', label: 'Platforms' },
    { key: 'influence', label: 'Influence Score' },
    { key: 'firstSeen', label: 'First Seen' },
  ],
};

export type { ExportType, ExportOptions };
