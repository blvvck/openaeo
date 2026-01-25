/**
 * Anthropic API Client (Claude)
 */

import Anthropic from '@anthropic-ai/sdk';
import { PlatformResponse, TokenUsage } from '../types';
import { BaseApiClient, SYSTEM_PROMPT } from './base-api-client';

export class AnthropicClient extends BaseApiClient {
    name = 'claude' as const;

    private model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
    private client: Anthropic | null = null;

    private getClient(): Anthropic {
        if (!this.client) {
            this.client = new Anthropic({
                apiKey: this.getApiKey()
            });
        }
        return this.client;
    }

    getApiKey(): string | undefined {
        return process.env.ANTHROPIC_API_KEY;
    }

    async query(prompt: string): Promise<PlatformResponse> {
        if (!this.isAvailable()) {
            return this.createErrorResponse(new Error('ANTHROPIC_API_KEY not configured'));
        }

        try {
            const response = await this.callWithRetry(async () => {
                return this.getClient().messages.create({
                    model: this.model,
                    max_tokens: 2048,
                    system: SYSTEM_PROMPT,
                    messages: [
                        { role: 'user', content: prompt }
                    ]
                });
            });

            // Extract text from content blocks
            let text = '';
            for (const block of response.content) {
                if (block.type === 'text') {
                    text += block.text;
                }
            }

            const usage: TokenUsage = {
                inputTokens: response.usage.input_tokens,
                outputTokens: response.usage.output_tokens
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
