/**
 * DeepSeek API Client (OpenAI-compatible)
 */

import OpenAI from 'openai';
import { PlatformResponse, TokenUsage } from '../types';
import { BaseApiClient, SYSTEM_PROMPT } from './base-api-client';

export class DeepSeekClient extends BaseApiClient {
    name = 'deepseek' as const;

    private model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    private getClient(apiKey = this.getApiKey()): OpenAI {
        return new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com' });
    }

    getApiKey(): string | undefined {
        return process.env.DEEPSEEK_API_KEY;
    }

    async query(prompt: string, apiKey?: string): Promise<PlatformResponse> {
        const resolvedKey = await this.resolveWorkspaceKey('deepseek', apiKey);
        if (!resolvedKey) {
            return this.createErrorResponse(new Error('DEEPSEEK_API_KEY not configured'));
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
