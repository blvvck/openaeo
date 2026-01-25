/**
 * Citation Components Types
 *
 * Types for citation/source tracking and display.
 */

/** Supported AI platforms */
export type Platform = 'chatgpt' | 'claude' | 'perplexity' | 'gemini' | 'grok' | 'deepseek';

/** Citation source entry */
export interface Citation {
  id: number;
  url: string;
  domain: string;
  snippet: string;
  platforms: Platform[];
  influenceScore: number;
  responseCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

/** Grouped citations by domain */
export interface CitationGroup {
  domain: string;
  citations: Citation[];
  totalInfluence: number;
  totalResponses: number;
}

/** Response that cited a source */
export interface CitingResponse {
  id: number;
  platform: Platform;
  query: string;
  snippet: string;
  position: number;
  timestamp: string;
}

/** Full citation details with responses */
export interface CitationDetails extends Citation {
  responses: CitingResponse[];
}

/** Platform display info */
export const PLATFORM_INFO: Record<Platform, { label: string; color: string }> = {
  chatgpt: { label: 'ChatGPT', color: '#10A37F' },
  claude: { label: 'Claude', color: '#D97706' },
  perplexity: { label: 'Perplexity', color: '#6366F1' },
  gemini: { label: 'Gemini', color: '#4285F4' },
  grok: { label: 'Grok', color: '#000000' },
  deepseek: { label: 'DeepSeek', color: '#2563EB' },
};
