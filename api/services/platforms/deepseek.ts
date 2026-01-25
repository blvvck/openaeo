
import { Page } from 'puppeteer';
import { BaseScraper } from './base-scraper';
import { Citation, PlatformName } from './types';

export class DeepSeekScraper extends BaseScraper {
    name: PlatformName = 'deepseek';
    // Note: DeepSeek often has a chat subdomain
    baseUrl = 'https://chat.deepseek.com/?q={prompt}';

    protected async detectLoginRedirect(page: Page): Promise<boolean> {
        const url = page.url();
        if (url.includes('login') || url.includes('sign-in')) {
            return true;
        }

        // Check for DeepSeek specific login form wrapper or "Log in" button
        try {
            const loginWrapper = await page.$('.ds-sign-in-form-wrapper');
            if (loginWrapper) return true;

            const loginButton = await page.$('button.ds-basic-button--primary');
            if (loginButton) {
                const text = await page.evaluate(el => el.textContent, loginButton);
                if (text && text.trim() === 'Log in') return true;
            }
        } catch (e) {
            // ignore
        }

        return false;
    }

    protected async waitForResponseComplete(page: Page): Promise<void> {
        try {
            // Wait for chat bubble
            await page.waitForSelector('.ds-chat-message', { timeout: 15000 }).catch(() => {
                // Fallback
            });

            // Wait for streaming cursor to disappear
            await page.waitForFunction(() => !document.querySelector('.ds-cursor'), { timeout: 30000 });
        } catch (e) {
            console.warn('DeepSeek wait timeout');
        }
    }

    async extractResponse(page: Page): Promise<string> {
        await this.takeSnapshot(page, 'deepseek_debug', 'extract_attempt');

        return page.evaluate(() => {
            // Strategy 1: Specific class names (ds-chat-message, message-content)
            const messages = document.querySelectorAll('.ds-chat-message, .message-content, .ds-text');
            if (messages.length > 0) {
                // DeepSeek usually has user messages and bot messages. Bot messages are usually odd indexed or have specific sub-classes
                // For now, let's grab the last message that is reasonably long
                const last = messages[messages.length - 1];
                if (last.textContent && last.textContent.length > 5) return last.textContent;
            }

            // Strategy 2: Markdown containers
            const markdown = document.querySelectorAll('.markdown, .ds-markdown');
            if (markdown.length > 0) {
                return markdown[markdown.length - 1].textContent || '';
            }

            // Strategy 3: Regex Fallback on Body Text
            // If all else fails, return the full body text to let the analyzer deal with it?
            // Or better, try to find the longest block of text

            // Allow returning full body for debugging if empty
            return document.body.innerText || '';
        });
    }

    async extractCitations(page: Page): Promise<Citation[]> {
        return page.evaluate(() => {
            const citations: any[] = [];

            // DeepSeek often uses [1], [2] superscript style links similar to Perplexity/Bing
            const messages = document.querySelectorAll('.ds-chat-message, .message-content, .ds-text');
            if (messages.length === 0) return [];

            const lastMessage = messages[messages.length - 1];
            const links = lastMessage.querySelectorAll('sup a, a.citation');

            links.forEach((link, index) => {
                const href = link.getAttribute('href');
                const title = link.getAttribute('title') || link.textContent || 'Source';

                if (href) {
                    citations.push({
                        url: href,
                        title: title,
                        snippet: '',
                        order: citations.length + 1
                    });
                }
            });

            return citations;
        });
    }
}
