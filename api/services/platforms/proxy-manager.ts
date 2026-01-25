
import axios from 'axios';

// --- Configuration Constants ---
const SCRAPEOPS_API_KEY = process.env.SCRAPEOPS_API_KEY || 'YOUR_SCRAPEOPS_API_KEY'; // TODO: Move to .env
const DAILY_BUDGET_LIMIT_USD = 2.00; // Hard stop at $2/day
const COST_PER_REQUEST_ESTIMATE = 0.002; // Average cost per successful proxy request

// --- State Tracking (In-memory for MVP, later move to DB) ---
let dailySpend = 0.0;
let lastResetDate = new Date().toDateString();

export class ProxyManager {

    /**
     * Checks if we have enough budget to proceed with a proxy request.
     * Resets the counter if it's a new day.
     */
    static checkBudget(): boolean {
        const today = new Date().toDateString();

        // Reset daily spend if new day
        if (today !== lastResetDate) {
            dailySpend = 0.0;
            lastResetDate = today;
            console.log('🔄 New day detected. Daily budget reset.');
        }

        if (dailySpend >= DAILY_BUDGET_LIMIT_USD) {
            console.warn(`⚠️ Daily proxy budget exceeded ($${dailySpend.toFixed(2)} / $${DAILY_BUDGET_LIMIT_USD}). Request blocked.`);
            return false;
        }

        return true;
    }

    /**
     * Records the cost of a request.
     */
    static recordSpend(cost: number = COST_PER_REQUEST_ESTIMATE): void {
        dailySpend += cost;
        console.log(`💰 Proxy Spend Updated: $${dailySpend.toFixed(4)} / $${DAILY_BUDGET_LIMIT_USD}`);
    }

    /**
     * Generates a ScrapeOps proxy URL for the given target URL.
     * This is used when we want to use the "Proxy API" mode (fetch based), 
     * OR if we want to configure Puppeteer to use the proxy endpoint.
     */
    static getScrapeOpsUrl(targetUrl: string, renderJs: boolean = true): string {
        const baseUrl = 'https://proxy.scrapeops.io/v1/';
        const params = new URLSearchParams({
            api_key: SCRAPEOPS_API_KEY,
            url: targetUrl,
            render_js: renderJs ? 'true' : 'false',
            country: 'us', // Lock to US for consistency
            premium: 'true', // Use residential IPs
        });

        return `${baseUrl}?${params.toString()}`;
    }

    /**
     * Fetches a page using ScrapeOps Proxy (Fetch/API Mode).
     * Useful for simple HTML pages or when Puppeteer fails hard.
     */
    static async fetchWithProxy(url: string): Promise<string | null> {
        if (!this.checkBudget()) {
            throw new Error('BUDGET_EXCEEDED');
        }

        try {
            const proxyUrl = this.getScrapeOpsUrl(url);
            const response = await axios.get(proxyUrl);

            this.recordSpend(); // Record successful spend
            return response.data;
        } catch (error: any) {
            console.error(`❌ Proxy Fetch Failed: ${error.message}`);
            return null;
        }
    }
}
