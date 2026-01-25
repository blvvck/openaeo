/**
 * Prompt CSV Importer
 *
 * Handles bulk import of prompts from CSV files.
 * Supports columns: prompt (required), topic (optional), tags (optional, comma-separated)
 */

import { prisma } from '../../prisma';
import { currentWorkspaceId } from '../../context/workspace-context';
import type { InsertPrompt, Prompt, Topic } from '../../../shared/schema';
import { getTagManager } from './tag-manager';

function workspaceId(): string {
  const id = currentWorkspaceId();
  if (!id) throw new Error('Workspace context is required for data access');
  return id;
}

function mapRow<T>(row: Record<string, unknown>): T {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
    value,
  ])) as T;
}

/**
 * CSV row structure
 */
export interface CsvRow {
  prompt: string;
  topic?: string;
  tags?: string;
}

/**
 * Validation error for a single row
 */
export interface RowError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

/**
 * Import result
 */
export interface ImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  errors: RowError[];
  importedPrompts: Prompt[];
}

/**
 * Import options
 */
export interface ImportOptions {
  /** Skip rows with errors and continue */
  skipOnError?: boolean;
  /** Create topics if they don't exist */
  createTopics?: boolean;
  /** Create tags if they don't exist */
  createTags?: boolean;
  /** Default journey stage for all imported prompts */
  defaultJourneyStage?: string;
}

const DEFAULT_OPTIONS: ImportOptions = {
  skipOnError: true,
  createTopics: true,
  createTags: true,
};

/**
 * Parse CSV content into rows
 * Handles quoted fields with commas
 */
export function parseCsv(content: string): CsvRow[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have a header row and at least one data row');
  }

  // Parse header
  const headerLine = lines[0].toLowerCase();
  const headers = parseCsvLine(headerLine);

  // Find column indices
  const promptIdx = headers.findIndex(h => h === 'prompt' || h === 'text');
  const topicIdx = headers.findIndex(h => h === 'topic' || h === 'category');
  const tagsIdx = headers.findIndex(h => h === 'tags' || h === 'labels');

  if (promptIdx === -1) {
    throw new Error('CSV must have a "prompt" or "text" column');
  }

  // Parse data rows
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const fields = parseCsvLine(line);

    rows.push({
      prompt: fields[promptIdx] || '',
      topic: topicIdx >= 0 ? fields[topicIdx] : undefined,
      tags: tagsIdx >= 0 ? fields[tagsIdx] : undefined,
    });
  }

  return rows;
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  fields.push(current.trim());

  return fields;
}

/**
 * Validate a single row
 */
function validateRow(row: CsvRow, rowNumber: number): RowError[] {
  const errors: RowError[] = [];

  // Prompt is required
  if (!row.prompt || !row.prompt.trim()) {
    errors.push({
      row: rowNumber,
      field: 'prompt',
      message: 'Prompt text is required',
    });
  }

  // Prompt length check
  if (row.prompt && row.prompt.length > 2000) {
    errors.push({
      row: rowNumber,
      field: 'prompt',
      message: 'Prompt text exceeds 2000 characters',
      value: row.prompt.slice(0, 50) + '...',
    });
  }

  return errors;
}

/**
 * Import prompts from CSV content
 */
export async function importPromptsFromCsv(
  content: string,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const tagManager = getTagManager();

  // Parse CSV
  const rows = parseCsv(content);

  const result: ImportResult = {
    success: true,
    totalRows: rows.length,
    successCount: 0,
    errorCount: 0,
    skippedCount: 0,
    errors: [],
    importedPrompts: [],
  };

  // Cache for topics and tags
  const topicCache = new Map<string, Topic>();
  const tagIdCache = new Map<string, number>();

  // Pre-load existing topics
  const existingTopics = await prisma.topics.findMany({ where: { workspace_id: workspaceId() } });
  for (const topic of existingTopics) {
    topicCache.set(topic.name.toLowerCase(), mapRow<Topic>(topic));
  }

  // Process each row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // +2 for header and 1-based indexing

    // Validate row
    const rowErrors = validateRow(row, rowNumber);
    if (rowErrors.length > 0) {
      result.errors.push(...rowErrors);
      result.errorCount++;

      if (!opts.skipOnError) {
        result.success = false;
        break;
      }
      continue;
    }

    try {
      // Resolve topic
      let topicId: number | null = null;
      if (row.topic) {
        const topicName = row.topic.trim();
        const cachedTopic = topicCache.get(topicName.toLowerCase());

        if (cachedTopic) {
          topicId = cachedTopic.id;
        } else if (opts.createTopics) {
          // Create new topic
          const newTopic = await prisma.topics.create({ data: { name: topicName, workspace_id: workspaceId() } });
          const mappedTopic = mapRow<Topic>(newTopic);
          topicCache.set(topicName.toLowerCase(), mappedTopic);
          topicId = mappedTopic.id;
        }
        // If topic doesn't exist and createTopics is false, topicId stays null
      }

      // Create prompt
      const prompt = await prisma.prompts.create({
        data: {
          workspace_id: workspaceId(),
          text: row.prompt.trim(),
          topic_id: topicId,
          journey_stages: opts.defaultJourneyStage ? [opts.defaultJourneyStage] : [],
        },
      });
      const mappedPrompt = mapRow<Prompt>(prompt);

      // Handle tags
      if (row.tags) {
        const tagNames = row.tags.split(',')
          .map(t => t.trim())
          .filter(t => t.length > 0);

        for (const tagName of tagNames) {
          let tagId = tagIdCache.get(tagName.toLowerCase());

          if (!tagId) {
            if (opts.createTags) {
              const tag = await tagManager.getOrCreate(tagName);
              tagId = tag.id;
              tagIdCache.set(tagName.toLowerCase(), tagId);
            } else {
              const existingTag = await tagManager.getByName(tagName);
              if (existingTag) {
                tagId = existingTag.id;
                tagIdCache.set(tagName.toLowerCase(), tagId);
              }
            }
          }

          if (tagId) {
              await tagManager.assignToPrompt(mappedPrompt.id, tagId);
          }
        }
      }

      result.importedPrompts.push(mappedPrompt);
      result.successCount++;
    } catch (error: any) {
      result.errors.push({
        row: rowNumber,
        field: 'general',
        message: error.message || 'Failed to import row',
      });
      result.errorCount++;

      if (!opts.skipOnError) {
        result.success = false;
        break;
      }
    }
  }

  // Update success flag
  result.success = result.errorCount === 0 || (opts.skipOnError === true && result.successCount > 0);

  return result;
}

/**
 * Import prompts from rows directly (for API usage)
 */
export async function importPromptsFromRows(
  rows: CsvRow[],
  options: ImportOptions = {}
): Promise<ImportResult> {
  // Convert rows to CSV format and import
  const header = 'prompt,topic,tags';
  const csvLines = rows.map(r => {
    const prompt = r.prompt.includes(',') ? `"${r.prompt.replace(/"/g, '""')}"` : r.prompt;
    const topic = r.topic?.includes(',') ? `"${r.topic.replace(/"/g, '""')}"` : (r.topic || '');
    const tags = r.tags?.includes(',') ? `"${r.tags.replace(/"/g, '""')}"` : (r.tags || '');
    return `${prompt},${topic},${tags}`;
  });

  const csvContent = [header, ...csvLines].join('\n');
  return importPromptsFromCsv(csvContent, options);
}
