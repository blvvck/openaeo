import puppeteer, { Page, Browser, LaunchOptions } from 'puppeteer';
import { PlatformScraper, PlatformResponse, PlatformName, Citation, ScrapeMethod } from './types';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export abstract class BaseScraper implements PlatformScraper {
    abstract name: PlatformName;
    abstract baseUrl: string;

    // Anti-detection configuration
    protected headless: boolean = true;
    protected minDelay: number = 2000;
    protected maxDelay: number = 5000;

    async scrape(prompt: string, method: ScrapeMethod | 'direct' = 'direct'): Promise<PlatformResponse> {
        if (method === 'api') {
            return this.scrapeViaBrowserApi(prompt);
        }

        const useProxy = method === 'proxy';

        let browser: Browser | null = null;
        try {
            // 1. Launch Browser with Stealth settings
            browser = await this.launchBrowser(useProxy);
            const page = await browser.newPage();

            // 2. Auth for Proxy if needed
            if (useProxy && process.env.SCRAPEOPS_API_KEY) {
                await page.authenticate({
                    username: 'scrapeops',
                    password: process.env.SCRAPEOPS_API_KEY
                });
            }

            // 3. Optimize Page (Block Resources) - Add this BEFORE navigation
            await this.optimizePage(page);

            // 4. Apply Stealth Headers & Evasions
            await this.applyStealth(page);

            // 4. Navigate to Platform
            await this.simulateHumanNavigation(page, this.constructUrl(prompt));

            // 5. Check for Login Redirects
            if (await this.detectLoginRedirect(page)) {
                await this.takeSnapshot(page, `${this.name}_login_redirect`);
                throw new Error('LOGIN_REQUIRED');
            }

            // 6. Wait for Response (Platform specific)
            await this.waitForResponseComplete(page);

            // 7. Extract Data
            const text = await this.extractResponse(page);
            const citations = await this.extractCitations(page);

            if (!text || text.length === 0) {
                console.warn(`[${this.name}] Empty response extracted. Saving snapshot...`);
                await this.takeSnapshot(page, `${this.name}_empty_response`);
            }

            return {
                success: true,
                platform: this.name,
                method: method,
                text,
                citations,
                cost: useProxy ? 0.01 : 0, // Placeholder cost
                timestamp: new Date()
            };

        } catch (error: any) {
            // ... existing error handler
            if (browser) {
                // Try to take a screenshot/snapshot if page exists
            }

            return {
                success: false,
                platform: this.name,
                method: method,
                text: '',
                citations: [],
                cost: 0,
                timestamp: new Date(),
                error: error.message
            };
        } finally {
            if (browser) await browser.close();
        }
    }

    protected async scrapeViaBrowserApi(prompt: string): Promise<PlatformResponse> {
        console.log(`[${this.name}] Trying ScrapeOps Browser API...`);
        let browser: Browser | null = null;

        try {
            const targetUrl = this.constructUrl(prompt);
            const apiKey = process.env.SCRAPEOPS_API_KEY;

            if (!apiKey) throw new Error('SCRAPEOPS_API_KEY not configured');

            // 1. Fetch HTML from ScrapeOps (Remote Rendering)
            const response = await axios.get('https://proxy.scrapeops.io/v1/', {
                params: {
                    api_key: apiKey,
                    url: targetUrl,
                    render_js: true,
                    wait: 5000, // Wait 5s on their side
                    country: 'us',
                },
                timeout: 120000 // 2 min timeout for their API
            });

            const html = response.data;

            // 2. Load HTML into local lightweight Puppeteer to use our extractors
            // We don't need proxy here, just a local rendering of the fetched HTML
            browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
            const page = await browser.newPage();

            await page.setContent(html, { waitUntil: 'domcontentloaded' });

            // 3. Extract using existing logic
            const text = await this.extractResponse(page);
            const citations = await this.extractCitations(page);

            return {
                success: true,
                platform: this.name,
                method: 'api',
                text: text || '',
                citations,
                cost: 0.02, // API cost is higher
                timestamp: new Date()
            };

        } catch (error: any) {
            console.error(`[${this.name}] Browser API failed: ${error.message}`);
            return {
                success: false,
                platform: this.name,
                method: 'api',
                text: '',
                citations: [],
                cost: 0,
                timestamp: new Date(),
                error: `API_ERROR: ${error.message}`
            };
        } finally {
            if (browser) await browser.close();
        }
    }

    protected async takeSnapshot(page: Page, label: string, suffix?: string): Promise<void> {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            // If suffix provided (e.g., sanitized prompt), use it. Otherwise use timestamp.
            const namePart = suffix ? `${label}_${suffix}` : `${label}_${timestamp}`;
            const filename = `${namePart}.html`;
            const snapshotsDir = path.join(process.cwd(), 'snapshots');

            if (!fs.existsSync(snapshotsDir)) {
                fs.mkdirSync(snapshotsDir, { recursive: true });
            }

            const filepath = path.join(snapshotsDir, filename);

            const content = await page.content();
            fs.writeFileSync(filepath, content);
            console.log(`📸 Snapshot saved: ${filepath}`);

            // Also take screenshot for visual debug
            await page.screenshot({ path: filepath.replace('.html', '.png') as any });
        } catch (error) {
            console.error(`Failed to take snapshot: ${error}`);
        }
    }

    // --- Abstract Methods to be implemented by children ---
    protected abstract detectLoginRedirect(page: Page): Promise<boolean>;
    abstract extractResponse(page: Page): Promise<string>;
    abstract extractCitations(page: Page): Promise<Citation[]>;

    protected abstract waitForResponseComplete(page: Page): Promise<void>;

    protected constructUrl(prompt: string): string {
        return this.baseUrl.replace('{prompt}', encodeURIComponent(prompt));
    }

    protected async launchBrowser(useProxy: boolean): Promise<Browser> {
        const args = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-infobars',
            '--window-position=0,0',
            '--ignore-certificate-errors',
            '--ignore-certificate-errors-spki-list',
            '--disable-blink-features=AutomationControlled', // Crucial: Hide webdriver
        ];

        if (useProxy) {
            if (process.env.SCRAPEOPS_API_KEY) {
                args.push('--proxy-server=http://proxy.scrapeops.io:8080');
            } else if (process.env.PROXY_URL) {
                args.push(`--proxy-server=${process.env.PROXY_URL}`);
            }
        }

        const launchOptions: LaunchOptions = {
            headless: this.headless,
            args: args
        };

        return puppeteer.launch(launchOptions);
    }

    protected async optimizePage(page: Page): Promise<void> {
        await page.setRequestInterception(true);

        page.on('request', (req) => {
            const resourceType = req.resourceType();

            // Block heavy resources that choke the proxy
            const blockedTypes = [
                'image',
                'media',
                'font',
                // 'stylesheet', // Keeping styles for now as some apps check visibility
                'other'
            ];

            if (blockedTypes.includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });
    }

    protected async applyStealth(page: Page): Promise<void> {
        // 1. Set Random User Agent (Modern & Rotating)
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
        ];
        const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
        await page.setUserAgent(randomUA);

        // 2. Set Extra Headers (Human-like)
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'DNT': '1',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
        });

        // 3. Mask Webdriver
        await page.evaluateOnNewDocument(() => {
            // @ts-ignore
            const newProto = navigator.__proto__;
            delete newProto.webdriver;
            // @ts-ignore
            navigator.__proto__ = newProto;
        });
    }

    protected async simulateHumanNavigation(page: Page, url: string): Promise<void> {
        // Traffic Jitter: 2s + random(0-2s)
        const jitter = Math.floor(Math.random() * 2000);

        // Go to page
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });

        // Random wait after load
        await new Promise(r => setTimeout(r, this.minDelay + jitter));
    }

    protected async randomDelay(min: number = 1000, max: number = 3000): Promise<void> {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        await new Promise(r => setTimeout(r, delay));
    }
}
