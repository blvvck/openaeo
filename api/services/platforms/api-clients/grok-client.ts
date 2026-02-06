/**
 * Grok API Client (OpenAI-compatible via xAI)
 */

import OpenAI from 'openai';
import { PlatformResponse, TokenUsage } from '../types';
import { BaseApiClient, SYSTEM_PROMPT } from './base-api-client';

export class GrokClient extends BaseApiClient {
    name = 'grok' as const;

    private model = process.env.GROK_MODEL || 'grok-3-mini';
    private getClient(apiKey = this.getApiKey()): OpenAI {
        return new OpenAI({ apiKey, baseURL: 'https://api.x.ai/v1' });
    }

    getApiKey(): string | undefined {
        return process.env.XAI_API_KEY;
    }

    async query(prompt: string, apiKey?: string): Promise<PlatformResponse> {
        const resolvedKey = await this.resolveWorkspaceKey('xai', apiKey);
        if (!resolvedKey) {
            return this.createErrorResponse(new Error('XAI_API_KEY not configured'));
        }

        try {
            const response = await this.callWithRetry(async () => {
                return this.getClient(resolvedKey).chat.completions.create({
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
