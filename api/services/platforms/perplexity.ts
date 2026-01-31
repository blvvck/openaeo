
import { Page } from 'puppeteer';
import { BaseScraper } from './base-scraper';
import { Citation, PlatformName } from './types';

export class PerplexityScraper extends BaseScraper {
    name: PlatformName = 'perplexity';
    baseUrl = 'https://www.perplexity.ai/search/new?q={prompt}';

    async detectLoginRedirect(page: Page): Promise<boolean> {
        const url = page.url();
        // Perplexity normally allows anonymous search but might prompt login after few tries
        // or mask the content with a modal
        if (url.includes('/login')) return true;

        // Check for "Sign up to continue" modal
        try {
            const modalText = await page.evaluate(() => document.body.innerText); // efficient enough for text check
            if (modalText.includes('Sign up to continue') || modalText.includes('Log in to continue')) {
                return true;
            }
        } catch {
            // ignore
        }

        return false;
    }

    protected async waitForResponseComplete(page: Page): Promise<void> {
        try {
            // 1. Wait for the answer container to appear
            // Perplexity uses various atomic classes, but usually has semantic markers or specific query structures
            // We look for the main answer container.
            await page.waitForSelector('.prose', { timeout: 15000 }); // "prose" class is common for markdown content

            // 2. Wait for streaming to stop. 
            // Perplexity usually has a visual indicator "Searching..." or "Reading X sources"
            // When done, it settles.

            // Heuristic: Wait for text length to stabilize or a specific "Copy" button to appear
            await page.waitForSelector('button[aria-label="Copy"]', { timeout: 30000 });

        } catch (e) {
            console.warn('Perplexity wait timeout/error:', e);
        }
    }

    async extractResponse(page: Page): Promise<string> {
        await this.takeSnapshot(page, 'perplexity_debug', 'extract_attempt');

        return page.evaluate(() => {
            // Strategy 1: Standard Prose Classes
            const proseElements = document.querySelectorAll('.prose'); // Tailwind typography class
            if (proseElements.length > 0) {
                let bestCandidate = '';
                let maxLength = 0;

                proseElements.forEach(el => {
                    const text = el.textContent || '';
                    if (text.length > maxLength) {
                        maxLength = text.length;
                        bestCandidate = text;
                    }
                });
                if (bestCandidate) return bestCandidate;
            }

            // Strategy 2: Main Content Area
            const main = document.querySelector('main');
            // If we have a main area, try to exclude the input box
            if (main) {
                // Clone or traverse
                return main.innerText.replace('Ask anything...', '').trim();
            }

            // Strategy 3: Fallback specific Perplexity divs
            // Often "div.col-span-8" or similar

            return document.body.innerText;
        });
    }

    async extractCitations(page: Page): Promise<Citation[]> {
        return page.evaluate(() => {
            const citations: any[] = [];

            // Perplexity lists sources clearly at the top or side
            // Often in a grid with extraction.

            // Selector for source cards (approximate based on common UI)
            // They often have titles and domain icons.

            // Strategy 1: Look for numbered citation links in the text [1] and map them if possible
            // Strategy 2: Look for the specific 'Sources' UI section.

            // Let's try finding the source links. They usually have attributes like 'href' and are grouped.

            // Generic approach for now: Find all external links in the "Sources" container.
            // Note: exact class names change often in Next.js apps like Perplexity.
            // We look for a block that contains "Sources" text header.

            const allDivs = Array.from(document.querySelectorAll('div'));
            const sourcesHeaderContext = allDivs.find(d => /^Sources$/i.test(d.innerText.trim()) && d.childElementCount === 0);

            if (sourcesHeaderContext && sourcesHeaderContext.parentElement) {
                // The parent or sibling likely contains the grid of sources
                const container = sourcesHeaderContext.parentElement.parentElement; // Go up a bit
                if (container) {
                    const links = container.querySelectorAll('a');
                    links.forEach((link, index) => {
                        const title = link.innerText;
                        const href = link.href;
                        if (title && href) {
                            citations.push({
                                url: href,
                                title: title,
                                snippet: '',
                                order: index + 1
                            });
                        }
                    });
                }
            }

            return citations;
        });
    }
}
