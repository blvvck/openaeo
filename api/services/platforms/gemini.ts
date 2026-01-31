
import { Page } from 'puppeteer';
import { BaseScraper } from './base-scraper';
import { Citation, PlatformName } from './types';

export class GeminiScraper extends BaseScraper {
    name: PlatformName = 'gemini';
    baseUrl = 'https://gemini.google.com/app?q={prompt}';

    protected async detectLoginRedirect(page: Page): Promise<boolean> {
        const url = page.url();
        // Check URL patterns
        if (url.includes('accounts.google.com') || url.includes('signin/identifier')) {
            return true;
        }

        // Check for "Sign in" specific elements
        try {
            // Look for the "Sign in" link/button usually present on the landing page
            const signInLink = await page.$('a[href*="accounts.google.com"]');
            const signInText = await page.evaluate(() => {
                return document.body.innerText.includes('Sign in') || document.body.innerText.includes('Sign In');
            });

            if (signInLink || signInText) {
                return true;
            }
        } catch (error) {
            // Ignore errors during detection
        }

        return false;
    }

    protected async waitForResponseComplete(page: Page): Promise<void> {
        try {
            // Check for potential login wall or error content first
            // ... (handled by detectLoginRedirect earlier, but good to be safe)

            // Wait for at least one model-response-message
            // Selectors in Gemini are obfuscated often, but usually accessible via attributes
            await page.waitForSelector('model-response', { timeout: 15000 });
        } catch (e) {
            console.warn('Gemini wait timeout');
        }
    }

    async extractResponse(page: Page): Promise<string> {
        // ALWAYS snapshot for debugging during this tuning phase
        await this.takeSnapshot(page, 'gemini_debug', 'extract_attempt');

        return page.evaluate(() => {
            // Strategy 1: Standard model-response selector
            const responses = document.querySelectorAll('model-response');
            if (responses.length > 0) {
                const last = responses[responses.length - 1];
                if (last.textContent && last.textContent.length > 10) return last.textContent;
            }

            // Strategy 2: Text searching for common response containers
            // Gemini responses are often in paragraphs inside specific angular containers
            const paragraphs = Array.from(document.querySelectorAll('p'));
            const likelyResponse = paragraphs.filter(p => p.parentElement?.tagName.includes('ANGULAR') || p.className.includes('response'));
            if (likelyResponse.length > 0) {
                return likelyResponse.map(p => p.textContent).join('\n');
            }

            // Strategy 3: Regex Fallback on Body Text (Client-side)
            // Just grab the main content text if possible
            const mainContent = document.querySelector('main');
            if (mainContent) return mainContent.innerText;

            return document.body.innerText;
        });
    }

    async extractCitations(page: Page): Promise<Citation[]> {
        return page.evaluate(() => {
            const citations: any[] = [];
            // Strategy 1: Look for "citation-chip" or source links (Gemini UI specific)
            const chips = document.querySelectorAll('citation-chip a, .source-link a');

            chips.forEach((link: any, index) => {
                if (link.href && link.href.startsWith('http')) {
                    citations.push({
                        url: link.href,
                        title: link.innerText || link.getAttribute('aria-label') || 'Source',
                        snippet: '',
                        order: citations.length + 1
                    });
                }
            });

            // Strategy 2: Fallback to inline links in the last response if chips are missing
            if (citations.length === 0) {
                const responses = document.querySelectorAll('model-response');
                if (responses.length > 0) {
                    const lastResponse = responses[responses.length - 1];
                    const links = lastResponse.querySelectorAll('a[href]');
                    links.forEach((link, index) => {
                        const href = link.getAttribute('href');
                        // Exclude Google searches/maps/internal
                        if (href && href.startsWith('http') && !href.includes('google.com/search')) {
                            citations.push({
                                url: href,
                                title: link.textContent || 'Source',
                                snippet: '',
                                order: citations.length + 1
                            });
                        }
                    });
                }
            }

            return citations;
        });
    }
}
