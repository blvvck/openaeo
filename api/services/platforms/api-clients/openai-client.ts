/**
 * OpenAI API Client (ChatGPT)
 */

import OpenAI from 'openai';
import { PlatformResponse, TokenUsage } from '../types';
import { BaseApiClient, SYSTEM_PROMPT } from './base-api-client';

export class OpenAIClient extends BaseApiClient {
    name = 'chatgpt' as const;

    private model = process.env.OPENAI_MODEL || 'gpt-4o';
    private client: OpenAI | null = null;

    private getClient(): OpenAI {
        if (!this.client) {
            this.client = new OpenAI({
                apiKey: this.getApiKey()
            });
        }
        return this.client;
    }

    getApiKey(): string | undefined {
        return process.env.OPENAI_API_KEY;
    }

    async query(prompt: string): Promise<PlatformResponse> {
        if (!this.isAvailable()) {
            return this.createErrorResponse(new Error('OPENAI_API_KEY not configured'));
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
