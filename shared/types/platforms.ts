/**
 * Platform Types - Shared Type Definitions
 *
 * Single source of truth for AI platform metadata.
 * Used by both frontend and backend.
 */

/**
 * Platform ID - the canonical identifier for each AI platform
 */
export type PlatformId =
  | 'chatgpt'
  | 'claude'
  | 'gemini'
  | 'grok'
  | 'deepseek'
  | 'perplexity'
  | 'ai-mode'
  | 'ai-overview';

/**
 * Platform metadata for display
 */
export interface Platform {
  id: PlatformId;
  name: string;
  color: string;
}

/**
 * Response from GET /api/platforms
 */
export interface PlatformsResponse {
  platforms: Platform[];
}

/**
 * The canonical list of AI platforms we track
 * This is the single source of truth for platform metadata
 */
export const AI_PLATFORMS: Platform[] = [
  { id: 'chatgpt', name: 'ChatGPT', color: '#10A37F' },
  { id: 'claude', name: 'Claude', color: '#E07A2F' },
  { id: 'gemini', name: 'Gemini', color: '#8B5CF6' },
  { id: 'grok', name: 'Grok', color: '#6B7280' },
  { id: 'deepseek', name: 'DeepSeek', color: '#3B82F6' },
  { id: 'perplexity', name: 'Perplexity', color: '#06B6D4' },
  { id: 'ai-mode', name: 'AI Mode', color: '#EC4899' },
  { id: 'ai-overview', name: 'AI Overview', color: '#F59E0B' },
] as const;

/**
 * Map for O(1) lookups by platform ID
 */
export const PLATFORM_MAP = new Map<string, Platform>(
  AI_PLATFORMS.map(p => [p.id, p])
);

/**
 * Get platform info by ID
 * Returns fallback if platform not found
 */
export function getPlatformById(id: string): Platform {
  const normalized = id.toLowerCase().replace(/_/g, '-');
  return PLATFORM_MAP.get(normalized) || {
    id: id as PlatformId,
    name: id,
    color: '#6B7280',
  };
}

/**
 * Get platform color by ID
 */
export function getPlatformColor(id: string): string {
  return getPlatformById(id).color;
}
