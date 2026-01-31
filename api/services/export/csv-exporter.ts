/**
 * CSV Exporter Service
 *
 * Exports data to CSV format with configurable columns and proper escaping.
 */

import { storage } from '../../data';
import type { Prompt, Response, Competitor, Source } from '@shared/schema';

export type ExportType = 'prompts' | 'responses' | 'competitors' | 'sources';

interface ExportColumn {
  key: string;
  header: string;
}

const PROMPT_COLUMNS: ExportColumn[] = [
  { key: 'id', header: 'ID' },
  { key: 'text', header: 'Prompt Text' },
  { key: 'topicId', header: 'Topic ID' },
  { key: 'journeyStage', header: 'Journey Stage' },
  { key: 'personaId', header: 'Persona ID' },
  { key: 'createdAt', header: 'Created At' },
];

const RESPONSE_COLUMNS: ExportColumn[] = [
  { key: 'id', header: 'ID' },
  { key: 'promptId', header: 'Prompt ID' },
  { key: 'text', header: 'Response Text' },
  { key: 'brandMentioned', header: 'Brand Mentioned' },
  { key: 'competitorsMentioned', header: 'Competitors Mentioned' },
  { key: 'sources', header: 'Sources' },
  { key: 'createdAt', header: 'Created At' },
];

const COMPETITOR_COLUMNS: ExportColumn[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Name' },
  { key: 'category', header: 'Category' },
  { key: 'mentionCount', header: 'Mention Count' },
  { key: 'lastMentioned', header: 'Last Mentioned' },
];

const SOURCE_COLUMNS: ExportColumn[] = [
  { key: 'id', header: 'ID' },
  { key: 'domain', header: 'Domain' },
  { key: 'url', header: 'URL' },
  { key: 'title', header: 'Title' },
  { key: 'citationCount', header: 'Citation Count' },
  { key: 'lastCited', header: 'Last Cited' },
];

const COLUMN_MAP: Record<ExportType, ExportColumn[]> = {
  prompts: PROMPT_COLUMNS,
  responses: RESPONSE_COLUMNS,
  competitors: COMPETITOR_COLUMNS,
  sources: SOURCE_COLUMNS,
};

/**
 * Escape a value for CSV (handles quotes, commas, newlines)
 */
function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  let str: string;
  if (value instanceof Date) {
    str = value.toISOString();
  } else if (Array.isArray(value)) {
    str = value.join('; ');
  } else if (typeof value === 'object') {
    str = JSON.stringify(value);
  } else {
    str = String(value);
  }

  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }

  return str;
}

/**
 * Convert array of objects to CSV string
 */
function toCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn[]
): string {
  // Header row
  const header = columns.map(col => escapeCSV(col.header)).join(',');

  // Data rows
  const rows = data.map(item =>
    columns.map(col => escapeCSV(item[col.key])).join(',')
  );

  return [header, ...rows].join('\n');
}

/**
 * Get available columns for an export type
 */
export function getAvailableColumns(type: ExportType): ExportColumn[] {
  return COLUMN_MAP[type] || [];
}

/**
 * Filter columns based on user selection
 */
function filterColumns(
  allColumns: ExportColumn[],
  selectedKeys?: string[]
): ExportColumn[] {
  if (!selectedKeys || selectedKeys.length === 0) {
    return allColumns;
  }
  return allColumns.filter(col => selectedKeys.includes(col.key));
}

export interface ExportOptions {
  /** Columns to include (omit for all) */
  columns?: string[];
  /** Filter by date range */
  startDate?: Date;
  endDate?: Date;
}

/**
 * Export prompts to CSV
 */
export async function exportPrompts(options: ExportOptions = {}): Promise<string> {
  const prompts = await storage.getPrompts();
  const columns = filterColumns(PROMPT_COLUMNS, options.columns);

  // Filter out archived prompts
  const activePrompts = prompts.filter(p => !p.archivedAt);

  return toCSV(activePrompts as unknown as Record<string, unknown>[], columns);
}

/**
 * Export responses to CSV
 */
export async function exportResponses(options: ExportOptions = {}): Promise<string> {
  const responses = await storage.getResponses();
  const columns = filterColumns(RESPONSE_COLUMNS, options.columns);

  return toCSV(responses as unknown as Record<string, unknown>[], columns);
}

/**
 * Export competitors to CSV
 */
export async function exportCompetitors(options: ExportOptions = {}): Promise<string> {
  const competitors = await storage.getCompetitors();
  const columns = filterColumns(COMPETITOR_COLUMNS, options.columns);

  return toCSV(competitors as unknown as Record<string, unknown>[], columns);
}

/**
 * Export sources to CSV
 */
export async function exportSources(options: ExportOptions = {}): Promise<string> {
  const sources = await storage.getSources();
  const columns = filterColumns(SOURCE_COLUMNS, options.columns);

  return toCSV(sources as unknown as Record<string, unknown>[], columns);
}

/**
 * Export data by type
 */
export async function exportData(
  type: ExportType,
  options: ExportOptions = {}
): Promise<string> {
  switch (type) {
    case 'prompts':
      return exportPrompts(options);
    case 'responses':
      return exportResponses(options);
    case 'competitors':
      return exportCompetitors(options);
    case 'sources':
      return exportSources(options);
    default:
      throw new Error(`Unknown export type: ${type}`);
  }
}

/**
 * Get filename for export
 */
export function getExportFilename(type: ExportType): string {
  const date = new Date().toISOString().split('T')[0];
  return `${type}-export-${date}.csv`;
}
