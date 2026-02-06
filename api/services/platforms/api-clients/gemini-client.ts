/**
 * Gemini API Client (Google) with Search Grounding
 * 
 * Supports google_search_retrieval for real-time web citations
 */

import { GoogleGenerativeAI, DynamicRetrievalMode } from '@google/generative-ai';
import { PlatformResponse, TokenUsage, Citation } from '../types';
import { BaseApiClient, SYSTEM_PROMPT, extractUrlsFromText } from './base-api-client';

export class GeminiClient extends BaseApiClient {
    name = 'gemini' as const;

    private model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    private enableGrounding = process.env.GEMINI_GROUNDING !== 'false';

    private getGenAI(apiKey = this.getApiKey()): GoogleGenerativeAI {
        return new GoogleGenerativeAI(apiKey || '');
    }

    getApiKey(): string | undefined {
        return process.env.GOOGLE_API_KEY;
    }

    async query(prompt: string, apiKey?: string): Promise<PlatformResponse> {
        const resolvedKey = await this.resolveWorkspaceKey('gemini', apiKey);
        if (!resolvedKey) {
            return this.createErrorResponse(new Error('GOOGLE_API_KEY not configured'));
        }

        try {
            const response = await this.callWithRetry(async () => {
                const modelConfig: any = {
                    model: this.model,
                    systemInstruction: SYSTEM_PROMPT
                };

                // Enable Google Search grounding for citations
                if (this.enableGrounding) {
                    modelConfig.tools = [{
                        googleSearchRetrieval: {
                            dynamicRetrievalConfig: {
                                mode: DynamicRetrievalMode.MODE_DYNAMIC,
                                dynamicThreshold: 0.3
                            }
                        }
                    }];
                }

                const model = this.getGenAI(resolvedKey).getGenerativeModel(modelConfig);
                return model.generateContent(prompt);
            });

            const result = response.response;
            const text = result.text();

            // Get usage metadata
            const usageMetadata = result.usageMetadata;
            const usage: TokenUsage = {
                inputTokens: usageMetadata?.promptTokenCount || 0,
                outputTokens: usageMetadata?.candidatesTokenCount || 0
            };

            // Extract citations from grounding metadata OR from text
            let citations: Citation[] = [];
            const groundingMetadata = (result as any).candidates?.[0]?.groundingMetadata;

            if (groundingMetadata?.groundingChunks) {
                // Native grounding citations
                citations = groundingMetadata.groundingChunks.map((chunk: any, i: number) => ({
                    url: chunk.web?.uri || '',
                    title: chunk.web?.title || '',
                    snippet: '',
                    order: i + 1
                })).filter((c: Citation) => c.url);
            } else {
                // Fall back to extracting URLs from text
                citations = extractUrlsFromText(text);
            }

            return {
                success: true,
                platform: this.name,
                method: 'api',
                text,
                citations,
                cost: this.calculateCost(this.model, usage),
                timestamp: new Date(),
                usage,
                model: this.model,
                metadata: {
                    grounded: !!groundingMetadata?.groundingChunks,
                    searchQueries: groundingMetadata?.webSearchQueries || []
                }
            };

        } catch (error: any) {
            console.error(`[${this.name}] API error:`, error.message);
            return this.createErrorResponse(error);
        }
    }
}
