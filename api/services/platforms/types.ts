
import { Page, Browser } from 'puppeteer';

export type PlatformName = 'chatgpt' | 'claude' | 'gemini' | 'perplexity' | 'grok' | 'deepseek' | 'google-ai-overview' | 'google-ai-mode';

export type ScrapeMethod = 'direct' | 'proxy' | 'api';

/**
 * Error types for better error handling
 */
export type ErrorType = 'rate_limit' | 'auth_error' | 'network_error' | 'quota_exceeded' | 'model_not_found' | 'unknown';

export interface Citation {
  url: string;
  title?: string;
  snippet?: string;
  order: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface PlatformResponse {
  success: boolean;
  text: string;
  citations: Citation[];
  platform: PlatformName;
  method: ScrapeMethod;
  cost: number;
  timestamp: Date;
  error?: string;
  errorType?: ErrorType;
  usage?: TokenUsage;
  model?: string;
  metadata?: Record<string, any>;
}

export interface PlatformScraper {
  name: PlatformName;
  baseUrl: string;

  /**
   * Main scrape method that orchestrates the process
   */
  scrape(prompt: string, method?: ScrapeMethod): Promise<PlatformResponse>;
}

export interface PlatformConfig {
  enabled: boolean;
  priority: number;
  budgetLimitUsd?: number;
}

/**
 * API Client interface for direct LLM API calls
 */
export interface ApiClient {
  name: PlatformName;

  /**
   * Check if the client has required API key configured
   */
  isAvailable(): boolean;

  /**
   * Query the LLM API with a prompt
   */
  query(prompt: string): Promise<PlatformResponse>;
}

/**
 * Cost rates per 1M tokens for each model
 */
export const COST_RATES: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  // Anthropic
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
  'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  // Perplexity
  'sonar': { input: 1.00, output: 1.00 },
  'sonar-pro': { input: 3.00, output: 15.00 },
  // Gemini  
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  'gemini-1.5-pro': { input: 1.25, output: 5.00 },
  // Grok
  'grok-3': { input: 3.00, output: 15.00 },
  'grok-3-mini': { input: 0.30, output: 0.50 },
  'grok-2': { input: 2.00, output: 10.00 },
  // DeepSeek
  'deepseek-chat': { input: 0.14, output: 0.28 },
  'deepseek-reasoner': { input: 0.55, output: 2.19 },
  // Gemini 2.0
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'gemini-2.0-flash-lite': { input: 0.075, output: 0.30 },
};

/**
 * Calculate cost from token usage
 */
export function calculateCost(model: string, usage: TokenUsage): number {
  const rates = COST_RATES[model];
  if (!rates) return 0;
  return (usage.inputTokens * rates.input + usage.outputTokens * rates.output) / 1_000_000;
}
