
import { Page } from 'puppeteer';
import { BaseScraper } from './base-scraper';
import { Citation, PlatformName } from './types';

export class ClaudeScraper extends BaseScraper {
    name: PlatformName = 'claude';
    baseUrl = 'https://claude.ai/new?q={prompt}';

    protected async detectLoginRedirect(page: Page): Promise<boolean> {
        const url = page.url();
        if (url.includes('claude.ai/login')) {
            return true;
        }

        // Check for specific login elements since Claude might show a landing page
        try {
            // Check for Google or Email sign in buttons/texts
            const content = await page.content();
            if (content.includes('Sign in with email') || content.includes('Continue with Google')) {
                return true;
            }

            // Check if we are on the landing page but not logged in (no chat input)
            const chatInput = await page.$('div[contenteditable="true"]');
            if (!chatInput) {
                return true;
            }
        } catch (e) {
            // ignore
        }

        return false;
    }

    protected async waitForResponseComplete(page: Page): Promise<void> {
        try {
            // Wait for at least one assistant message
            await page.waitForSelector('.font-claude-message', { timeout: 15000 }).catch(() => {
                // Fallback selector attempt
                return page.waitForSelector('[data-test-id="chat-message-content"]', { timeout: 5000 });
            });

            // Wait for streaming to finish
            // Strategy: Wait for text length to stabilize for 2 seconds
            await page.waitForFunction(() => {
                // This is a naive heuristic but works for MVP
                // We assume if text hasn't changed in 500ms, it might be done (though Claude is fast)
                const buttons = Array.from(document.querySelectorAll('button'));
                // Look for the "Send" button (arrow icon) which usually means input is ready
                return buttons.some(b => b.ariaLabel === 'Send Message' || b.querySelector('svg'));
            }, { timeout: 45000 });

        } catch (e) {
            console.warn('Claude wait timeout');
        }
    }

    async extractResponse(page: Page): Promise<string> {
        await this.takeSnapshot(page, 'claude_debug', 'extract_attempt');

        return page.evaluate(() => {
            // Strategy 1: Known Claude classes
            const messages = document.querySelectorAll('.font-claude-message, [data-test-id="chat-message-content"]');
            if (messages.length > 0) {
                return messages[messages.length - 1].textContent || '';
            }

            // Strategy 2: Content Editable div siblings (User input is contenteditable, Assistant response is usually earlier sibling or in a grid)
            // Look for the grid container
            const gridItems = document.querySelectorAll('.grid.gap-2');
            if (gridItems.length > 0) {
                const lastItem = gridItems[gridItems.length - 1];
                return lastItem.textContent || '';
            }

            // Strategy 3: Fallback to main content area
            const main = document.querySelector('main');
            if (main) return main.innerText;

            return '';
        });
    }

    async extractCitations(page: Page): Promise<Citation[]> {
        return page.evaluate(() => {
            // Claude uses standard Markdown-rendered HTML with <a> tags.
            const citations: any[] = [];
            const messages = document.querySelectorAll('.font-claude-message, [data-test-id="chat-message-content"]');
            if (messages.length === 0) return [];

            const lastMessage = messages[messages.length - 1];
            const links = lastMessage.querySelectorAll('a');

            links.forEach((link, index) => {
                const href = link.href;
                // Filter out internal application links or mailto
                if (href && href.startsWith('http') && !href.includes('claude.ai')) {
                    citations.push({
                        url: href,
                        title: link.textContent?.trim() || 'Link',
                        snippet: '',
                        order: citations.length + 1
                    });
                }
            });

            return citations;
        });
    }
}
