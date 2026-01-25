/**
 * Base API Client for LLM Platform Integration
 * Provides shared functionality: retry logic, URL extraction, cost calculation
 */

import { PlatformName, PlatformResponse, Citation, TokenUsage, calculateCost } from '../types';

/**
 * System prompt to encourage LLMs to include citations
 */
export const SYSTEM_PROMPT = `You are a helpful AI assistant. When answering questions:
1. Provide accurate, helpful information
2. Include relevant source URLs inline with your response
3. Format sources as: "According to [Source Name](https://url.com)..." or list them at the end
4. Prioritize authoritative sources (official docs, reputable publications)

Example: "HubSpot CRM (https://hubspot.com/crm) offers a free tier that includes..."`;

/**
 * Sleep utility for backoff
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract URLs from response text
 */
export function extractUrlsFromText(text: string): Citation[] {
    // Match URLs in text (handles most common formats)
    const urlRegex = /https?:\/\/[^\s\)\]\>\"\'<]+/gi;
    const urls = text.match(urlRegex) || [];

    // Deduplicate and format
    const uniqueUrls = Array.from(new Set(urls));
    return uniqueUrls.map((rawUrl, i) => {
        // Clean trailing punctuation
        const url = rawUrl.replace(/[.,;:!?\)]+$/, '');
        let hostname = '';
        try {
            hostname = new URL(url).hostname;
        } catch {
            hostname = url;
        }
        return {
            url,
            title: hostname,
            snippet: '',
            order: i + 1
        };
    });
}

/**
 * Abstract base class for all API clients
 */
export abstract class BaseApiClient {
    abstract name: PlatformName;

    /**
     * Check if the client has required API key configured
     */
    isAvailable(): boolean {
        return !!this.getApiKey();
    }

    /**
     * Get the API key for this platform
     */
    abstract getApiKey(): string | undefined;

    /**
     * Query the LLM API with a prompt
     */
    abstract query(prompt: string): Promise<PlatformResponse>;

    /**
     * Call with retry and exponential backoff
     * Handles rate limits (429) with retry-after header
     */
    protected async callWithRetry<T>(
        fn: () => Promise<T>,
        maxRetries = 3
    ): Promise<T> {
        let lastError: any;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error: any) {
                lastError = error;

                // Handle rate limits (429) with retry-after
                if (error.status === 429 || error.code === 'rate_limit_exceeded') {
                    const retryAfter = error.headers?.['retry-after'] || Math.pow(2, attempt);
                    console.log(`[${this.name}] Rate limited. Waiting ${retryAfter}s... (attempt ${attempt}/${maxRetries})`);
                    await sleep(Number(retryAfter) * 1000);
                    continue;
                }

                // Exponential backoff for transient errors
                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000;
                    console.log(`[${this.name}] Error: ${error.message}. Retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`);
                    await sleep(delay);
                    continue;
                }
            }
        }

        throw lastError;
    }

    /**
     * Categorize error type from error object
     */
    protected categorizeError(error: any): import('../types').ErrorType {
        const message = (error.message || String(error)).toLowerCase();
        const status = error.status || error.statusCode;

        if (status === 429 || message.includes('rate limit') || message.includes('too many requests')) {
            return 'rate_limit';
        }
        if (status === 401 || status === 403 || message.includes('unauthorized') || message.includes('invalid api key')) {
            return 'auth_error';
        }
        if (message.includes('quota') || message.includes('exceeded')) {
            return 'quota_exceeded';
        }
        if (status === 404 || message.includes('model') && message.includes('not found')) {
            return 'model_not_found';
        }
        if (message.includes('network') || message.includes('timeout') || message.includes('econnrefused')) {
            return 'network_error';
        }
        return 'unknown';
    }

    /**
     * Create a failed response with error categorization
     */
    protected createErrorResponse(error: any): PlatformResponse {
        return {
            success: false,
            platform: this.name,
            method: 'api',
            text: '',
            citations: [],
            cost: 0,
            timestamp: new Date(),
            error: error.message || String(error),
            errorType: this.categorizeError(error)
        };
    }

    /**
     * Calculate cost from usage and model
     */
    protected calculateCost(model: string, usage: TokenUsage): number {
        return calculateCost(model, usage);
    }

    /**
     * Extract citations from response text
     */
    protected extractCitations(text: string): Citation[] {
        return extractUrlsFromText(text);
    }
}
