/**
 * Test API Clients
 * Run: npx tsx api/services/platforms/api-clients/test_api_clients.ts
 */

import 'dotenv/config';
import {
    apiClients,
    getAvailableClients,
    getApiStatus,
    clientsByPlatform
} from './index';
import { PlatformName } from '../types';

const TEST_PROMPT = 'What are the top 3 CRM tools for small businesses? Please include source URLs.';

async function testSingleClient(platform: PlatformName) {
    const client = clientsByPlatform[platform];

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${platform.toUpperCase()}`);
    console.log(`${'='.repeat(60)}`);

    if (!client.isAvailable()) {
        console.log(`⏭️  Skipped - No API key configured`);
        return null;
    }

    console.log(`📞 Calling API...`);
    const startTime = Date.now();

    try {
        const response = await client.query(TEST_PROMPT);
        const duration = Date.now() - startTime;

        console.log(`\n✅ Success in ${duration}ms`);
        console.log(`\n📝 Response (first 500 chars):`);
        console.log(`"${response.text.slice(0, 500)}${response.text.length > 500 ? '...' : ''}"`);

        console.log(`\n📊 Stats:`);
        console.log(`   Model: ${response.model || 'N/A'}`);
        console.log(`   Tokens: ${response.usage?.inputTokens || 0} in / ${response.usage?.outputTokens || 0} out`);
        console.log(`   Cost: $${response.cost.toFixed(6)}`);

        console.log(`\n🔗 Citations (${response.citations.length}):`);
        if (response.citations.length > 0) {
            response.citations.slice(0, 5).forEach((c, i) => {
                console.log(`   ${i + 1}. ${c.url}`);
            });
            if (response.citations.length > 5) {
                console.log(`   ... and ${response.citations.length - 5} more`);
            }
        } else {
            console.log(`   (none)`);
        }

        if (response.metadata) {
            console.log(`\n📎 Metadata:`, response.metadata);
        }

        return response;

    } catch (error: any) {
        const duration = Date.now() - startTime;
        console.log(`\n❌ Failed in ${duration}ms`);
        console.log(`   Error: ${error.message}`);
        return null;
    }
}

async function testAllClients() {
    console.log(`\n${'#'.repeat(60)}`);
    console.log(`# API Clients Test Suite`);
    console.log(`# Prompt: "${TEST_PROMPT.slice(0, 50)}..."`);
    console.log(`${'#'.repeat(60)}`);

    // Show status
    const status = getApiStatus();
    console.log(`\n📡 API Status:`);
    Object.entries(status).forEach(([platform, available]) => {
        console.log(`   ${available ? '✅' : '❌'} ${platform}`);
    });

    const available = getAvailableClients();
    console.log(`\n🚀 Testing ${available.length} available clients...`);

    if (available.length === 0) {
        console.log(`\n⚠️  No API keys configured. Add keys to your .env file.`);
        console.log(`   See example.env for all available options.`);
        return;
    }

    // Test each available client
    const results: Record<string, any> = {};
    let totalCost = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (const client of available) {
        const result = await testSingleClient(client.name as PlatformName);
        results[client.name] = result;

        if (result) {
            totalCost += result.cost;
            totalInputTokens += result.usage?.inputTokens || 0;
            totalOutputTokens += result.usage?.outputTokens || 0;
        }
    }

    // Summary
    console.log(`\n${'#'.repeat(60)}`);
    console.log(`# Summary`);
    console.log(`${'#'.repeat(60)}`);

    const successful = Object.values(results).filter(r => r?.success).length;
    const failed = Object.values(results).filter(r => r && !r.success).length;

    console.log(`\n📊 Results:`);
    console.log(`   Successful: ${successful}/${available.length}`);
    console.log(`   Failed: ${failed}/${available.length}`);
    console.log(`   Total tokens: ${totalInputTokens} in / ${totalOutputTokens} out`);
    console.log(`   Total cost: $${totalCost.toFixed(6)}`);

    // Citation comparison
    console.log(`\n🔗 Citation Count by Platform:`);
    Object.entries(results).forEach(([platform, result]) => {
        if (result) {
            const nativeCitations = result.metadata?.nativeCitationCount;
            const citations = result.citations?.length || 0;
            const nativeNote = nativeCitations !== undefined ? ` (${nativeCitations} native)` : '';
            console.log(`   ${platform}: ${citations}${nativeNote}`);
        }
    });
}

// Run tests
testAllClients().catch(console.error);
