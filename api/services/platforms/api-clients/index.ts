/**
 * API Clients Index - 8 Platforms
 */

import { PlatformName } from '../types';
import { BaseApiClient } from './base-api-client';
import { OpenAIClient } from './openai-client';
import { AnthropicClient } from './anthropic-client';
import { PerplexityClient } from './perplexity-client';
import { GeminiClient } from './gemini-client';
import { GrokClient } from './grok-client';
import { DeepSeekClient } from './deepseek-client';
import { GoogleAIOverviewsClient } from './google-ai-overview-client';
import { GoogleAIModeClient } from './google-ai-mode-client';

export { BaseApiClient } from './base-api-client';
export { OpenAIClient } from './openai-client';
export { AnthropicClient } from './anthropic-client';
export { PerplexityClient } from './perplexity-client';
export { GeminiClient } from './gemini-client';
export { GrokClient } from './grok-client';
export { DeepSeekClient } from './deepseek-client';
export { GoogleAIOverviewsClient } from './google-ai-overview-client';
export { GoogleAIModeClient } from './google-ai-mode-client';

const openaiClient = new OpenAIClient();
const anthropicClient = new AnthropicClient();
const perplexityClient = new PerplexityClient();
const geminiClient = new GeminiClient();
const grokClient = new GrokClient();
const deepseekClient = new DeepSeekClient();
const googleAIOverviewClient = new GoogleAIOverviewsClient();
const googleAIModeClient = new GoogleAIModeClient();

export const apiClients: BaseApiClient[] = [
    openaiClient,
    anthropicClient,
    perplexityClient,
    geminiClient,
    grokClient,
    deepseekClient,
    googleAIOverviewClient,
    googleAIModeClient
];

export const clientsByPlatform: Record<PlatformName, BaseApiClient> = {
    chatgpt: openaiClient,
    claude: anthropicClient,
    perplexity: perplexityClient,
    gemini: geminiClient,
    grok: grokClient,
    deepseek: deepseekClient,
    'google-ai-overview': googleAIOverviewClient,
    'google-ai-mode': googleAIModeClient
};

export function getAvailableClients(): BaseApiClient[] {
    return apiClients.filter(client => client.isAvailable());
}

export function getClient(platform: PlatformName): BaseApiClient {
    return clientsByPlatform[platform];
}

export function hasApiAccess(platform: PlatformName): boolean {
    return clientsByPlatform[platform]?.isAvailable() ?? false;
}

export function getApiStatus(): Record<PlatformName, boolean> {
    return {
        chatgpt: openaiClient.isAvailable(),
        claude: anthropicClient.isAvailable(),
        perplexity: perplexityClient.isAvailable(),
        gemini: geminiClient.isAvailable(),
        grok: grokClient.isAvailable(),
        deepseek: deepseekClient.isAvailable(),
        'google-ai-overview': googleAIOverviewClient.isAvailable(),
        'google-ai-mode': googleAIModeClient.isAvailable()
    };
}
