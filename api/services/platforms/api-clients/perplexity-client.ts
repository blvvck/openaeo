/**
 * Perplexity API Client (OpenAI-compatible)
 * Best for citations - returns native citations from web search
 */

import OpenAI from 'openai';
import { PlatformResponse, TokenUsage, Citation } from '../types';
import { BaseApiClient, SYSTEM_PROMPT } from './base-api-client';

// Extended response type for Perplexity's citations
interface PerplexityResponse extends OpenAI.Chat.ChatCompletion {
    citations?: string[];
}

export class PerplexityClient extends BaseApiClient {
    name = 'perplexity' as const;

    private model = process.env.PERPLEXITY_MODEL || 'sonar';
    private getClient(apiKey = this.getApiKey()): OpenAI {
        return new OpenAI({ apiKey, baseURL: 'https://api.perplexity.ai' });
    }

    getApiKey(): string | undefined {
        return process.env.PERPLEXITY_API_KEY;
    }

    async query(prompt: string, apiKey?: string): Promise<PlatformResponse> {
        const resolvedKey = await this.resolveWorkspaceKey('perplexity', apiKey);
        if (!resolvedKey) {
            return this.createErrorResponse(new Error('PERPLEXITY_API_KEY not configured'));
        }

        try {
            const response = await this.callWithRetry(async () => {
                return this.getClient(resolvedKey).chat.completions.create({
                    model: this.model,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: prompt }
                    ]
                }) as Promise<PerplexityResponse>;
            });

            const text = response.choices[0]?.message?.content || '';
            const usage: TokenUsage = {
                inputTokens: response.usage?.prompt_tokens || 0,
                outputTokens: response.usage?.completion_tokens || 0
            };

            // Perplexity returns native citations from web search!
            let citations: Citation[] = [];
            if (response.citations && Array.isArray(response.citations)) {
                citations = response.citations.map((url, i) => ({
                    url,
                    title: new URL(url).hostname,
                    snippet: '',
                    order: i + 1
                }));
            }

            // Also extract any additional URLs from the text
            const textCitations = this.extractCitations(text);

            // Merge, dedupe by URL
            const allUrls = new Set(citations.map(c => c.url));
            for (const tc of textCitations) {
                if (!allUrls.has(tc.url)) {
                    citations.push({ ...tc, order: citations.length + 1 });
                }
            }

            return {
                success: true,
                platform: this.name,
                method: 'api',
                text,
                citations,
                cost: this.calculateCost(response.model, usage),
                timestamp: new Date(),
                usage,
                model: response.model,
                metadata: {
                    nativeCitationCount: response.citations?.length || 0
                }
            };

        } catch (error: any) {
            console.error(`[${this.name}] API error:`, error.message);
            return this.createErrorResponse(error);
        }
    }
}
