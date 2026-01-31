/**
 * Google AI Mode Client (via ScrapingDog)
 * 
 * Fetches Google's AI Mode conversational search responses.
 * Endpoint: /google/ai_mode
 * 
 * API docs: https://docs.scrapingdog.com/google-ai-mode-api
 * Cost: 10 credits per request
 */

import axios from 'axios';
import { PlatformResponse, Citation } from '../types';
import { BaseApiClient, extractUrlsFromText } from './base-api-client';

interface AIModeResponse {
    answer?: string;
    sources?: Array<{
        title?: string;
        link?: string;
        snippet?: string;
        position?: number;
    }>;
    related_questions?: string[];
    error?: string;
}

export class GoogleAIModeClient extends BaseApiClient {
    name = 'google-ai-mode' as const;

    private baseUrl = 'https://api.scrapingdog.com/google/ai_mode';

    getApiKey(): string | undefined {
        return process.env.SCRAPINGDOG_API_KEY;
    }

    async query(prompt: string): Promise<PlatformResponse> {
        if (!this.isAvailable()) {
            return this.createErrorResponse(new Error('SCRAPINGDOG_API_KEY not configured'));
        }

        try {
            const response = await this.callWithRetry(async () => {
                return axios.get<AIModeResponse>(this.baseUrl, {
                    params: {
                        api_key: this.getApiKey(),
                        query: prompt,
                        country: 'us'
                    },
                    timeout: 60000
                });
            });

            const data = response.data;

            if (data.error) {
                throw new Error(data.error);
            }

            const text = data.answer || '';

            // Extract citations from structured sources
            let citations: Citation[] = [];

            if (data.sources && Array.isArray(data.sources)) {
                citations = data.sources.map((source, i) => ({
                    url: source.link || '',
                    title: source.title || '',
                    snippet: source.snippet || '',
                    order: source.position || i + 1
                })).filter(c => c.url);
            }

            // Also extract any additional URLs from the text
            const textCitations = extractUrlsFromText(text);
            const existingUrls = new Set(citations.map(c => c.url));
            for (const tc of textCitations) {
                if (!existingUrls.has(tc.url)) {
                    citations.push({ ...tc, order: citations.length + 1 });
                }
            }

            return {
                success: true,
                platform: this.name,
                method: 'api',
                text,
                citations,
                cost: 0.001,
                timestamp: new Date(),
                usage: { inputTokens: 0, outputTokens: 0 },
                model: 'google-ai-mode',
                metadata: {
                    sourceCount: data.sources?.length || 0,
                    relatedQuestions: data.related_questions || []
                }
            };

        } catch (error: any) {
            console.error(`[${this.name}] API error:`, error.message);
            return this.createErrorResponse(error);
        }
    }
}
