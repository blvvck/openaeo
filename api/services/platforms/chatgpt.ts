
import { Page } from 'puppeteer';
import { BaseScraper } from './base-scraper';
import { Citation, PlatformName } from './types';

export class ChatGPTScraper extends BaseScraper {
    name: PlatformName = 'chatgpt';
    baseUrl = 'https://chatgpt.com/?q={prompt}';

    async detectLoginRedirect(page: Page): Promise<boolean> {
        const url = page.url();

        // Only trigger on actual auth redirect URLs, not just presence of login buttons
        // The anonymous ChatGPT shows login buttons but still works
        if (url.includes('/auth/login') || url.includes('auth0.openai.com')) {
            return true;
        }

        // Check if we're on a page that REQUIRES login (no content possible)
        // The landing page with "Log in" buttons but WITH response content is OK
        const hasResponseContent = await page.$('[data-turn="assistant"], [data-message-author-role="assistant"], .markdown.prose');
        if (hasResponseContent) {
            return false; // Has content, not a login wall
        }

        // Check for explicit login-required modal or page
        const loginModal = await page.$('[data-testid="login-modal"], .login-required-modal');
        if (loginModal) return true;

        // If page just has prompt input but no auth wall, it's not a login redirect
        return false;
    }

    protected async waitForResponseComplete(page: Page): Promise<void> {
        // ChatGPT's DOM uses different selectors - try multiple strategies
        const responseSelectors = [
            '[data-turn="assistant"]',           // New anonymous ChatGPT UI
            '[data-message-author-role="assistant"]', // Logged-in ChatGPT UI
            '.markdown.prose',                   // Markdown content container
        ];

        // 1. Wait for response container to appear
        let foundSelector = '';
        for (const selector of responseSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 8000 });
                console.log(`[chatgpt] Found response container: ${selector}`);
                foundSelector = selector;
                break;
            } catch (e) {
                // Try next selector
            }
        }

        if (!foundSelector) {
            throw new Error('Response failed to start generating - no matching selectors found');
        }

        // 2. Wait for actual content to appear (not just the container)
        // The response needs time to stream in
        console.log('[chatgpt] Waiting for response content to stream...');

        try {
            await page.waitForFunction(
                (selector) => {
                    const container = document.querySelector(selector);
                    if (!container) return false;

                    // Look for actual prose/markdown content with substance
                    const proseContent = container.querySelector('.markdown.prose, .prose, .markdown');
                    const textContent = proseContent?.textContent?.trim() || container.textContent?.trim() || '';

                    // Need at least 100 chars of actual response (not just "ChatGPT said:")
                    if (textContent.length < 100) return false;

                    // Check streaming indicators are gone
                    const stopBtn = document.querySelector('[data-testid="stop-button"]');
                    const streaming = document.querySelector('.streaming-animation');
                    const resultStreaming = document.querySelector('.result-streaming');

                    // If streaming indicators exist, wait more
                    if (stopBtn || streaming || resultStreaming) return false;

                    return true;
                },
                { timeout: 90000 }, // Longer timeout for full response
                foundSelector
            );
            console.log('[chatgpt] Response generation complete');
        } catch (e) {
            console.warn('[chatgpt] Timeout waiting for completion, checking content length...');

            // Even on timeout, check if we have meaningful content
            const hasContent = await page.evaluate((selector) => {
                const container = document.querySelector(selector);
                const text = container?.textContent?.trim() || '';
                return text.length > 100;
            }, foundSelector);

            if (!hasContent) {
                console.warn('[chatgpt] No meaningful content found after timeout');
            }
        }

        // Extra stability wait for final render
        await this.randomDelay(2000, 3000);
    }

    async extractResponse(page: Page): Promise<string> {
        await this.takeSnapshot(page, 'chatgpt_debug', 'extract_attempt');

        return page.evaluate(() => {
            // Strategy 1: New anonymous ChatGPT UI - data-turn="assistant"
            const turnMessages = document.querySelectorAll('[data-turn="assistant"]');
            if (turnMessages.length > 0) {
                const lastMessage = turnMessages[turnMessages.length - 1];
                // Get the prose/markdown content within
                const proseContent = lastMessage.querySelector('.markdown.prose, .prose, .markdown');
                if (proseContent) {
                    return proseContent.textContent?.trim() || '';
                }
                return lastMessage.textContent?.trim() || '';
            }

            // Strategy 2: Logged-in ChatGPT UI - data-message-author-role
            const roleMessages = document.querySelectorAll('[data-message-author-role="assistant"]');
            if (roleMessages.length > 0) {
                const lastMessage = roleMessages[roleMessages.length - 1];
                const proseContent = lastMessage.querySelector('.markdown.prose, .prose, .markdown');
                if (proseContent) {
                    return proseContent.textContent?.trim() || '';
                }
                return lastMessage.textContent?.trim() || '';
            }

            // Strategy 3: Direct markdown/prose selector
            const markdownProseElements = document.querySelectorAll('.markdown.prose');
            if (markdownProseElements.length > 0) {
                return markdownProseElements[markdownProseElements.length - 1].textContent?.trim() || '';
            }

            // Strategy 4: Any markdown content
            const markdown = document.querySelectorAll('.markdown');
            if (markdown.length > 0) {
                return markdown[markdown.length - 1].textContent?.trim() || '';
            }

            // Strategy 5: Look for text-message class containers
            const textMessages = document.querySelectorAll('.text-message');
            if (textMessages.length > 0) {
                return textMessages[textMessages.length - 1].textContent?.trim() || '';
            }

            // Last resort: Return empty to indicate extraction failed
            // Don't return body.innerText as it pollutes with nav/UI text
            console.warn('ChatGPT: No response selectors matched');
            return '';
        });
    }

    async extractCitations(page: Page): Promise<Citation[]> {
        return page.evaluate(() => {
            const citations: any[] = [];

            // Find the assistant message container using multiple strategies
            let lastMessage: Element | null = null;

            // Strategy 1: New UI
            const turnMessages = document.querySelectorAll('[data-turn="assistant"]');
            if (turnMessages.length > 0) {
                lastMessage = turnMessages[turnMessages.length - 1];
            }

            // Strategy 2: Logged-in UI
            if (!lastMessage) {
                const roleMessages = document.querySelectorAll('[data-message-author-role="assistant"]');
                if (roleMessages.length > 0) {
                    lastMessage = roleMessages[roleMessages.length - 1];
                }
            }

            if (!lastMessage) return [];

            // 1. Extract inline links which are not footnotes
            const links = lastMessage.querySelectorAll('a[href]');
            links.forEach((link) => {
                const href = link.getAttribute('href');
                const text = link.textContent?.trim() || '';

                // Exclude internal anchors or empty links
                if (href && !href.startsWith('#') && href.startsWith('http')) {
                    // Check if it's a citation bubble (often small numbers or 'Source') due to new UI
                    const isCitation = text.match(/^\[\d+\]$/) || link.className.includes('citation');

                    citations.push({
                        url: href,
                        title: isCitation ? `Source ${text}` : (text || 'Source'),
                        snippet: '',
                        order: citations.length + 1
                    });
                }
            });

            // 2. Look for "Sources" button container (SearchGPT style)
            // Sometimes sources are in a separate grid below the text
            const sourceCards = document.querySelectorAll('[data-testid="source-card"], .source-card');
            sourceCards.forEach((card) => {
                const link = card.querySelector('a');
                if (link && link.href) {
                    citations.push({
                        url: link.href,
                        title: card.textContent?.trim() || 'Reference',
                        snippet: '',
                        order: citations.length + 1
                    });
                }
            });

            return citations;
        });
    }
}
