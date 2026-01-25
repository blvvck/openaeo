/**
 * DeepSeek API Client (OpenAI-compatible)
 */

import OpenAI from 'openai';
import { PlatformResponse, TokenUsage } from '../types';
import { BaseApiClient, SYSTEM_PROMPT } from './base-api-client';

export class DeepSeekClient extends BaseApiClient {
    name = 'deepseek' as const;

    private model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    private client: OpenAI | null = null;

    private getClient(): OpenAI {
        if (!this.client) {
            this.client = new OpenAI({
                apiKey: this.getApiKey(),
                baseURL: 'https://api.deepseek.com'
            });
        }
        return this.client;
    }

    getApiKey(): string | undefined {
        return process.env.DEEPSEEK_API_KEY;
    }

    async query(prompt: string): Promise<PlatformResponse> {
        if (!this.isAvailable()) {
            return this.createErrorResponse(new Error('DEEPSEEK_API_KEY not configured'));
        }

        try {
            const response = await this.callWithRetry(async () => {
                return this.getClient().chat.completions.create({
                    model: this.model,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 2048
                });
            });

            const text = response.choices[0]?.message?.content || '';
            const usage: TokenUsage = {
                inputTokens: response.usage?.prompt_tokens || 0,
                outputTokens: response.usage?.completion_tokens || 0
            };

            return {
                success: true,
                platform: this.name,
                method: 'api',
                text,
                citations: this.extractCitations(text),
                cost: this.calculateCost(response.model, usage),
                timestamp: new Date(),
                usage,
                model: response.model
            };

        } catch (error: any) {
            console.error(`[${this.name}] API error:`, error.message);
            return this.createErrorResponse(error);
        }
    }
}
