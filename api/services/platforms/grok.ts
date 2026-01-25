
import { Page } from 'puppeteer';
import { BaseScraper } from './base-scraper';
import { Citation, PlatformName } from './types';

export class GrokScraper extends BaseScraper {
    name: PlatformName = 'grok';
    baseUrl = 'https://x.com/i/grok?text={prompt}';

    async detectLoginRedirect(page: Page): Promise<boolean> {
        const url = page.url();
        // X.com redirects to /i/flow/login or simply /login
        if (url.includes('/login') || url.includes('/flow/login')) return true;

        // X often shows a modal "Sign in to X" just by browsing
        try {
            const modalText = await page.evaluate(() => document.body.innerText);
            if (modalText.includes('Sign in to X') || modalText.includes('Log in to continue')) {
                return true;
            }
        } catch {
            // ignore
        }

        // Check for specific login button presence if URL didn't change
        const loginLink = await page.$('a[href="/login"]');
        if (loginLink) return true;

        return false;
    }

    protected async waitForResponseComplete(page: Page): Promise<void> {
        // Grok is new and dynamic. 
        // We wait for the message stream to complete.
        try {
            // Wait for output container
            // Note: X uses heavily obfuscated React classes (css-175oi2r etc)
            // We rely on aria-labels or known test-ids if available, otherwise structural.

            // Best bet for X: Look for the text stream container or "Grok" distinctive elements.
            // This is brittle and will likely need maintenance.

            // Wait for at least some text to appear after some delay
            await this.randomDelay(3000, 5000);

            // Wait for "generating" state to end. 
            // Often X has a progress bar or a "Stop" button.
        } catch (e) {
            console.warn('Grok wait timeout');
        }
    }

    async extractResponse(page: Page): Promise<string> {
        await this.takeSnapshot(page, 'grok_debug', 'extract_attempt');

        return page.evaluate(() => {
            // Strategy 1: Article / Message Structure
            const articles = document.querySelectorAll('article');
            if (articles.length > 0) {
                const last = articles[articles.length - 1];
                if (last.textContent && last.textContent.length > 10) return last.textContent;
            }

            // Strategy 2: Text Search for "Grok" or typical bot responses
            // Look for divs with substantial text content
            const divs = Array.from(document.querySelectorAll('div[data-testid="tweetText"]'));
            if (divs.length > 0) {
                return divs[divs.length - 1].textContent || '';
            }

            // Strategy 3: Fallback on body text if it looks like a conversation
            return document.body.innerText || '';
        });
    }

    async extractCitations(page: Page): Promise<Citation[]> {
        return page.evaluate(() => {
            const citations: any[] = [];

            // X often puts links in cards or 'a' tags within the tweet/article
            const articles = document.querySelectorAll('article');
            if (articles.length === 0) return [];

            const lastArticle = articles[articles.length - 1];
            const links = lastArticle.querySelectorAll('a[href]');

            links.forEach((link, index) => {
                const href = link.getAttribute('href');
                const text = link.textContent || 'Source';

                // Filter out hashtags, mentions, and internal nav
                // Valid external links on X usually go through t.co often, but internal ones might be /user
                if (href && !href.startsWith('/') && !href.startsWith('#')) {
                    citations.push({
                        url: href,
                        title: text,
                        snippet: '',
                        order: citations.length + 1
                    });
                }
            });

            return citations;
        });
    }
}
