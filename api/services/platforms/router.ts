/**
 * Platform Router - API-First Multi-Platform LLM Integration
 * 
 * Strategy:
 * 1. Call all available APIs in parallel (primary)
 * 2. If scraping enabled and APIs fail/missing: fallback to scraping
 */

import { PlatformName, PlatformResponse, TokenUsage } from './types';
import { BaseScraper } from './base-scraper';
import { ChatGPTScraper } from './chatgpt';
import { PerplexityScraper } from './perplexity';
import { ClaudeScraper } from './claude';
import { GeminiScraper } from './gemini';
import { GrokScraper } from './grok';
import { DeepSeekScraper } from './deepseek';
import { ENABLED_PLATFORMS } from '../../config/platforms';
import { ProxyManager } from './proxy-manager';
import { apiClients, getAvailableClients, getApiStatus } from './api-clients';

// Map of platform names to their scraper instances (for fallback)
// Note: google-ai-overview and google-ai-mode are API-only (no scraper fallback)
const scrapers: Partial<Record<PlatformName, BaseScraper>> = {
    chatgpt: new ChatGPTScraper(),
    perplexity: new PerplexityScraper(),
    claude: new ClaudeScraper(),
    gemini: new GeminiScraper(),
    grok: new GrokScraper(),
    deepseek: new DeepSeekScraper()
};

export interface MultiPlatformResult {
    prompt: string;
    results: Record<PlatformName, PlatformResponse>;
    aggregatedStats: {
        totalCost: number;
        totalInputTokens: number;
        totalOutputTokens: number;
        successfulPlatforms: number;
        failedPlatforms: number;
        apiCalls: number;
        scrapeCalls: number;
    };
}

export class PlatformRouter {

    /**
     * Orchestrates queries across all enabled platforms.
     * 
     * Strategy (API-First):
     * 1. Call all available APIs in parallel
     * 2. If ENABLE_SCRAPING=true: fallback to scraping for failed/missing platforms
     */
    static async analyzePromptAcrossPlatforms(prompt: string): Promise<MultiPlatformResult> {
        const results: Partial<Record<PlatformName, PlatformResponse>> = {};
        let apiCallCount = 0;
        let scrapeCallCount = 0;

        // Get API availability status
        const apiStatus = getApiStatus();
        const availableClients = getAvailableClients();

        console.log(`\n🚀 Starting API-First analysis for: "${prompt.slice(0, 50)}..."`);
        console.log(`📡 API Status: ${JSON.stringify(apiStatus)}`);
        console.log(`✅ Available APIs: ${availableClients.map(c => c.name).join(', ') || 'none'}`);

        // --- Step 1: Call all available APIs in parallel ---
        if (availableClients.length > 0) {
            console.log(`\n📞 Calling ${availableClients.length} APIs in parallel...`);

            const apiPromises = availableClients.map(async (client) => {
                try {
                    return await client.query(prompt);
                } catch (error: any) {
                    console.error(`[${client.name}] Uncaught error:`, error.message);
                    return {
                        success: false,
                        platform: client.name,
                        method: 'api' as const,
                        text: '',
                        citations: [],
                        cost: 0,
                        timestamp: new Date(),
                        error: error.message,
                        usage: undefined
                    } as PlatformResponse;
                }
            });

            const apiOutcomes = await Promise.allSettled(apiPromises);

            apiOutcomes.forEach((outcome, i) => {
                const platform = availableClients[i].name;
                if (outcome.status === 'fulfilled') {
                    results[platform] = outcome.value;
                    if (outcome.value.success) {
                        apiCallCount++;
                        console.log(`✅ [${platform}] API success: ${outcome.value.text.slice(0, 100)}...`);
                        if (outcome.value.usage) {
                            console.log(`   Tokens: ${outcome.value.usage.inputTokens} in / ${outcome.value.usage.outputTokens} out`);
                        }
                        console.log(`   Citations: ${outcome.value.citations.length}`);
                        console.log(`   Cost: $${outcome.value.cost.toFixed(6)}`);
                    } else {
                        console.log(`❌ [${platform}] API failed: ${outcome.value.error}`);
                    }
                } else {
                    console.log(`❌ [${platform}] API rejected: ${outcome.reason}`);
                    results[platform] = {
                        success: false,
                        platform,
                        method: 'api',
                        text: '',
                        citations: [],
                        cost: 0,
                        timestamp: new Date(),
                        error: String(outcome.reason)
                    };
                }
            });
        }

        // --- Step 2: Optional Scraping Fallback ---
        const scrapingEnabled = process.env.ENABLE_SCRAPING === 'true';

        if (scrapingEnabled) {
            // Find platforms that failed API or don't have API keys
            // Only include platforms that have scrapers (excludes google-ai-overview, google-ai-mode)
            const needsScraping = ENABLED_PLATFORMS.filter(platform =>
                !results[platform]?.success && scrapers[platform]
            );

            if (needsScraping.length > 0) {
                console.log(`\n🔧 Scraping fallback for ${needsScraping.length} platforms: ${needsScraping.join(', ')}`);

                // Step 2a: Try direct scraping first
                const directPromises = needsScraping.map(async (platform) => {
                    const scraper = scrapers[platform]!;
                    return scraper.scrape(prompt, 'direct');
                });

                const directOutcomes = await Promise.all(directPromises);

                directOutcomes.forEach((result) => {
                    if (result.success) {
                        results[result.platform] = result;
                        scrapeCallCount++;
                        console.log(`✅ [${result.platform}] Direct scrape success`);
                    }
                });

                // Step 2b: Retry failures with proxy
                const directFailures = directOutcomes.filter(r => !r.success && scrapers[r.platform]);

                if (directFailures.length > 0 && ProxyManager.checkBudget()) {
                    console.log(`\n🔄 Retrying ${directFailures.length} with proxy...`);

                    const proxyPromises = directFailures.map(async (failedResult) => {
                        const scraper = scrapers[failedResult.platform]!;
                        return scraper.scrape(prompt, 'proxy');
                    });

                    const proxyOutcomes = await Promise.all(proxyPromises);

                    proxyOutcomes.forEach((result) => {
                        results[result.platform] = result;
                        if (result.success) {
                            scrapeCallCount++;
                            ProxyManager.recordSpend();
                            console.log(`✅ [${result.platform}] Proxy scrape success`);
                        }
                    });
                }
            }
        }

        // --- Fill in missing platforms with error responses ---
        for (const platform of ENABLED_PLATFORMS) {
            if (!results[platform]) {
                results[platform] = {
                    success: false,
                    platform,
                    method: 'api',
                    text: '',
                    citations: [],
                    cost: 0,
                    timestamp: new Date(),
                    error: apiStatus[platform]
                        ? 'API call failed'
                        : 'No API key configured and scraping disabled'
                };
            }
        }

        // --- Aggregation ---
        const finalResults = results as Record<PlatformName, PlatformResponse>;

        let totalInputTokens = 0;
        let totalOutputTokens = 0;

        Object.values(finalResults).forEach(r => {
            if (r.usage) {
                totalInputTokens += r.usage.inputTokens;
                totalOutputTokens += r.usage.outputTokens;
            }
        });

        const stats = {
            totalCost: Object.values(finalResults).reduce((sum, r) => sum + (r.cost || 0), 0),
            totalInputTokens,
            totalOutputTokens,
            successfulPlatforms: Object.values(finalResults).filter(r => r.success).length,
            failedPlatforms: Object.values(finalResults).filter(r => !r.success).length,
            apiCalls: apiCallCount,
            scrapeCalls: scrapeCallCount
        };

        console.log(`\n📊 Summary:`);
        console.log(`   Successful: ${stats.successfulPlatforms}/${ENABLED_PLATFORMS.length}`);
        console.log(`   API calls: ${stats.apiCalls}, Scrape calls: ${stats.scrapeCalls}`);
        console.log(`   Total tokens: ${stats.totalInputTokens} in / ${stats.totalOutputTokens} out`);
        console.log(`   Total cost: $${stats.totalCost.toFixed(6)}`);

        return {
            prompt,
            results: finalResults,
            aggregatedStats: stats
        };
    }

    /**
     * Query a single platform
     */
    static async querySinglePlatform(platform: PlatformName, prompt: string): Promise<PlatformResponse> {
        const client = apiClients.find(c => c.name === platform);

        if (client?.isAvailable()) {
            return client.query(prompt);
        }

        // Fallback to scraping if enabled and scraper exists
        const scraper = scrapers[platform];
        if (process.env.ENABLE_SCRAPING === 'true' && scraper) {
            return scraper.scrape(prompt, 'direct');
        }

        return {
            success: false,
            platform,
            method: 'api',
            text: '',
            citations: [],
            cost: 0,
            timestamp: new Date(),
            error: scraper ? 'No API key configured and scraping disabled' : 'No API key configured (API-only platform)'
        };
    }
}

