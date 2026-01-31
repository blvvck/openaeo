/**
 * Google AI Overviews Client (via ScrapingDog)
 * 
 * Two-step process:
 * 1. Call Google Search API to get ai_overview_url 
 * 2. Call AI Overview API with that URL
 * 
 * Endpoint: /google/ai_overview
 * API docs: https://docs.scrapingdog.com/google-ai-overview-api
 * Cost: 5 credits (search) + 5 credits (overview) = 10 credits total
 */

import axios from 'axios';
import { PlatformResponse, Citation } from '../types';
import { BaseApiClient, extractUrlsFromText } from './base-api-client';

interface GoogleSearchResponse {
    ai_overview_url?: string;
    organic_results?: Array<{
        title?: string;
        link?: string;
        snippet?: string;
    }>;
}

interface AIOverviewResponse {
    ai_overview_text?: string;
    sources?: Array<{
        title?: string;
        link?: string;
        displayed_link?: string;
    }>;
    error?: string;
}

export class GoogleAIOverviewsClient extends BaseApiClient {
    name = 'google-ai-overview' as const;

    private searchUrl = 'https://api.scrapingdog.com/google';
    private overviewUrl = 'https://api.scrapingdog.com/google/ai_overview';

    getApiKey(): string | undefined {
        return process.env.SCRAPINGDOG_API_KEY;
    }

    async query(prompt: string): Promise<PlatformResponse> {
        if (!this.isAvailable()) {
            return this.createErrorResponse(new Error('SCRAPINGDOG_API_KEY not configured'));
        }

        try {
            // Step 1: Search Google to get ai_overview_url
            const searchResponse = await this.callWithRetry(async () => {
                return axios.get<GoogleSearchResponse>(this.searchUrl, {
                    params: {
                        api_key: this.getApiKey(),
                        query: prompt,
                        country: 'us',
                        results: 10
                    },
                    timeout: 60000
                });
            });

            const aiOverviewUrl = searchResponse.data.ai_overview_url;

            if (!aiOverviewUrl) {
                // No AI Overview available for this query - return empty but successful
                return {
                    success: true,
                    platform: this.name,
                    method: 'api',
                    text: '',
                    citations: [],
                    cost: 0.0005,
                    timestamp: new Date(),
                    usage: { inputTokens: 0, outputTokens: 0 },
                    model: 'google-ai-overview',
                    metadata: {
                        noOverviewAvailable: true
                    }
                };
            }

            // Step 2: Fetch the AI Overview using the URL
            const overviewResponse = await this.callWithRetry(async () => {
                return axios.get<AIOverviewResponse>(this.overviewUrl, {
                    params: {
                        api_key: this.getApiKey(),
                        url: aiOverviewUrl
                    },
                    timeout: 60000
                });
            });

            const data = overviewResponse.data;

            if (data.error) {
                throw new Error(data.error);
            }

            const text = data.ai_overview_text || '';

            // Extract citations from structured sources
            let citations: Citation[] = [];

            if (data.sources && Array.isArray(data.sources)) {
                citations = data.sources.map((source, i) => ({
                    url: source.link || '',
                    title: source.title || source.displayed_link || '',
                    snippet: '',
                    order: i + 1
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
                cost: 0.001, // 5 + 5 credits
                timestamp: new Date(),
                usage: { inputTokens: 0, outputTokens: 0 },
                model: 'google-ai-overview',
                metadata: {
                    sourceCount: data.sources?.length || 0
                }
            };

        } catch (error: any) {
            console.error(`[${this.name}] API error:`, error.message);
            return this.createErrorResponse(error);
        }
    }
}
